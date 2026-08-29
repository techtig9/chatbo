-- chatbo.ai — notification threshold tracking (Phase 1.14)
-- Tracks whether the 80%/100% low-credit warnings have already fired
-- this billing period, so a workspace hovering right at the threshold
-- doesn't get emailed on every single message. Reset alongside the
-- credit reset itself, not on a separate schedule, so the two can never
-- drift out of sync.

alter table subscriptions add column notified_80_at timestamptz;
alter table subscriptions add column notified_100_at timestamptz;

-- Extends deduct_credits (0002) to also return the pre-deduction
-- balance — checkCreditThresholds needs both before/after in the same
-- atomic operation to detect a threshold crossing accurately, rather
-- than a separate read that could race against a concurrent deduction.
create or replace function deduct_credits(p_workspace_id uuid, p_amount int)
returns table (success boolean, new_balance int, old_balance int)
language plpgsql
security definer
set search_path = public
as $$
declare
  balance_before int;
  balance_after int;
begin
  select credits_remaining into balance_before
  from subscriptions
  where workspace_id = p_workspace_id;

  update subscriptions
  set credits_remaining = credits_remaining - p_amount
  where workspace_id = p_workspace_id
    and credits_remaining >= p_amount
  returning credits_remaining into balance_after;

  if balance_after is null then
    return query select false, coalesce(balance_before, 0), coalesce(balance_before, 0);
  else
    return query select true, balance_after, balance_before;
  end if;
end;
$$;

create or replace function reset_monthly_credits(p_workspace_id uuid, p_plan_credits int)
returns void
language sql
security definer
set search_path = public
as $$
  update subscriptions
  set credits_remaining = p_plan_credits,
      renews_at = now() + interval '1 month',
      notified_80_at = null,
      notified_100_at = null
  where workspace_id = p_workspace_id;
$$;
