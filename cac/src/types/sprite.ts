export type DatabaseSprite = {
  id: number;
  name: string;
  image_paths: string;
  created_at: string;
  blocks_json: string;
  project_id: number;
};

export interface AssetDatabaseSprite extends DatabaseSprite {
  loadableImagePaths: string[];
}
