export type DatabaseSprite = {
  id: number;
  name: string;
  image_paths: {
    costumeName: string;
    loadablePath: string;
  }[];
  blocks_json: any[];
  variables_map: {
    id: string;
    name: string;
    isGlobal: boolean;
  }[];
  project_id: number;
};

export type DatabaseBackdrop = {
  id: number;
  name: string;
  image_paths: {
    costumeName: string;
    loadablePath: string;
  }[];
  blocks_json: any[];
  variables_map: {
    id: string;
    name: string;
    isGlobal: boolean;
  }[];
  project_id: number;
  isBackdrop: boolean;
};

export type DatabaseProject = {
  id: number;
  name: string;
  description: string;
  created_at: string;
  broadcasts_json: any[];
};
