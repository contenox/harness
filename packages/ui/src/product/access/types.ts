export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  subject: string;
}

export interface AccessGrant {
  id: string;
  identity: string;
  permission: string;
  resource: string;
  resourceType: string;
  identityName?: string;
  identityEmail?: string;
  resourceLabel?: string;
}
