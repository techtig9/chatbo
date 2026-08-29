export type IntegrationCategory = "commerce" | "crm" | "support" | "communication" | "productivity" | "payments";
export type OAuthMode = "oauth2" | "api_key";
export type IntegrationProvider = { key:string; name:string; description:string; category:IntegrationCategory; auth:OAuthMode; scopes:string[]; envPrefix:string; authorizationUrl?:string; tokenUrl?:string };
export const INTEGRATION_CATALOG: IntegrationProvider[] = [
{key:"slack",name:"Slack",description:"Send messages and automate team workflows.",category:"communication",auth:"oauth2",scopes:["chat:write","channels:read"],envPrefix:"SLACK",authorizationUrl:"https://slack.com/oauth/v2/authorize",tokenUrl:"https://slack.com/api/oauth.v2.access"},
{key:"shopify",name:"Shopify",description:"Access products, orders and store operations.",category:"commerce",auth:"oauth2",scopes:["read_products","read_orders"],envPrefix:"SHOPIFY"},
{key:"stripe",name:"Stripe",description:"Read customers, payments and billing data.",category:"payments",auth:"oauth2",scopes:["read_write"],envPrefix:"STRIPE",authorizationUrl:"https://connect.stripe.com/oauth/authorize",tokenUrl:"https://connect.stripe.com/oauth/token"},
{key:"hubspot",name:"HubSpot",description:"Manage CRM contacts, companies and deals.",category:"crm",auth:"oauth2",scopes:["crm.objects.contacts.read","crm.objects.contacts.write"],envPrefix:"HUBSPOT",authorizationUrl:"https://app.hubspot.com/oauth/authorize",tokenUrl:"https://api.hubapi.com/oauth/v1/token"},
{key:"salesforce",name:"Salesforce",description:"Connect agents to CRM records and workflows.",category:"crm",auth:"oauth2",scopes:["api","refresh_token"],envPrefix:"SALESFORCE"},
{key:"zendesk",name:"Zendesk",description:"Create and manage customer support tickets.",category:"support",auth:"oauth2",scopes:["tickets:read","tickets:write"],envPrefix:"ZENDESK"},
{key:"google_workspace",name:"Google Workspace",description:"Connect Gmail, Drive and Calendar workflows.",category:"productivity",auth:"oauth2",scopes:["openid","email"],envPrefix:"GOOGLE"},
{key:"microsoft_365",name:"Microsoft 365",description:"Connect Outlook, OneDrive and Microsoft services.",category:"productivity",auth:"oauth2",scopes:["openid","email","offline_access"],envPrefix:"MICROSOFT"},
{key:"notion",name:"Notion",description:"Search and update workspace knowledge.",category:"productivity",auth:"oauth2",scopes:[],envPrefix:"NOTION",authorizationUrl:"https://api.notion.com/v1/oauth/authorize",tokenUrl:"https://api.notion.com/v1/oauth/token"},
{key:"discord",name:"Discord",description:"Connect community and support automations.",category:"communication",auth:"oauth2",scopes:["identify","guilds"],envPrefix:"DISCORD",authorizationUrl:"https://discord.com/oauth2/authorize",tokenUrl:"https://discord.com/api/oauth2/token"},
];
export function getIntegrationProvider(key:string){return INTEGRATION_CATALOG.find(p=>p.key===key)}
export function providerEnv(provider:IntegrationProvider,suffix:"CLIENT_ID"|"CLIENT_SECRET"|"AUTHORIZATION_URL"|"TOKEN_URL"){return process.env[`${provider.envPrefix}_${suffix}`]}
