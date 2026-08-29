-- chatbo.ai — credit deduction (Phase 1.7)
-- Atomic: a single UPDATE ... WHERE credits_remaining >= amount, so two
-- concurrent requests against the same workspace can't both succeed past
-- a balance that only covers one of them (the read-then-write version of
-- this in application code has exactly that race).

create or replace function deduct_credits(p_workspace_id uuid, p_amount int)
returns table (success boolean, new_balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_balance int;
begin
  update subscriptions
  set credits_remaining = credits_remaining - p_amount
  where workspace_id = p_workspace_id
    and credits_remaining >= p_amount
  returning credits_remaining into updated_balance;

  if updated_balance is null then
    -- Either the workspace has insufficient credits, or no matching row —
    -- report current balance either way so the caller can show it.
    select credits_remaining into updated_balance
    from subscriptions
    where workspace_id = p_workspace_id;

    return query select false, coalesce(updated_balance, 0);
  else
    return query select true, updated_balance;
  end if;
end;
$$;

-- Monthly reset — called by a scheduled Inngest job (Phase 1.13/1.20's
-- job infra) on each subscription's renewal date, not by app code
-- directly. Resets to the plan's full allotment rather than adding, so a
-- partially-used balance never rolls over — matches "monthly credits"
-- as advertised on the pricing page, not a bank of credits that stacks.
create or replace function reset_monthly_credits(p_workspace_id uuid, p_plan_credits int)
returns void
language sql
security definer
set search_path = public
as $$
  update subscriptions
  set credits_remaining = p_plan_credits,
      renews_at = now() + interval '1 month'
  where workspace_id = p_workspace_id;
$$;
