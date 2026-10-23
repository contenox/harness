export interface InferenceModel {
  id: string;
  name: string;
  createdAt?: string;
}

export interface InferencePool {
  id: string;
  name: string;
  purpose: string;
}

export interface InferenceBackend {
  id: string;
  name: string;
  endpoint: string;
  kind: string;
  models: string[];
  availableModels?: string[];
  error?: string;
}

export interface ModelTransferStatus {
  status: string;
  total?: number;
  completed?: number;
}

export interface ProviderStatus {
  configured: boolean;
  updatedAt?: string;
}
