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
    type: string;
  }[];
  project_id: number;
};