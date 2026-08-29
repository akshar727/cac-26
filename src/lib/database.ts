import {
  DatabaseBackdrop,
  DatabaseProject,
  DatabaseSprite,
} from "@/types/database";
import { convertFileSrc } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

let creationLock = false;

export class DatabaseManager {
  private fileName = "cac.db";

  getProject(): Promise<DatabaseProject[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        let projects = await db.select<DatabaseProject[]>(
          `SELECT * FROM projects`,
        );
        // console.log("Projects:", projects);
        if (projects.length === 0 && !creationLock) {
          creationLock = true;
          await db.execute(
            "INSERT into projects (name, description) VALUES ('New Project', 'New Project')",
          );
          await db.execute(
            "INSERT into backdrops (name, image_paths, project_id) VALUES ('New Backdrop', '[]', 1)",
          );
          console.log("Inserted new project.");
          creationLock = false;
        }
        projects = await db.select<DatabaseProject[]>(`SELECT * FROM projects`);
        // console.log("Projects after insertion:", projects);
        for (const project of projects) {
          //@ts-ignore
          project.broadcasts_json = JSON.parse(project.broadcasts_json);
        }
        resolve(projects);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getSpritesForProject(projectId: number): Promise<DatabaseSprite[]> {
    const db = await Database.load(`sqlite:${this.fileName}`);
    const result = await db.select<DatabaseSprite[]>(
      `SELECT * from sprites WHERE project_id = ?`,
      [projectId],
    );
    for (const sprite of result) {
      //@ts-ignore
      sprite.image_paths = JSON.parse(sprite.image_paths);
      //@ts-ignore
      sprite.blocks_json = JSON.parse(sprite.blocks_json);
      //@ts-ignore
      sprite.variables_map = JSON.parse(sprite.variables_map);
    }
    return result as DatabaseSprite[];
  }

  async getBackdropsForProject(projectId: number): Promise<DatabaseBackdrop[]> {
    const db = await Database.load(`sqlite:${this.fileName}`);
    const result = await db.select<DatabaseBackdrop[]>(
      `SELECT * from backdrops WHERE project_id = ?`,
      [projectId],
    );
    for (const backdrop of result) {
      backdrop.blocks_json = backdrop.blocks_json
        ? //@ts-ignore
          JSON.parse(backdrop.blocks_json)
        : [];
      //@ts-ignore
      backdrop.image_paths = JSON.parse(backdrop.image_paths);
      backdrop.variables_map = backdrop.variables_map
        ? //@ts-ignore
          JSON.parse(backdrop.variables_map)
        : [];
      backdrop.isBackdrop = true;
      backdrop.id = -backdrop.id; // Assign a unique ID for backdrops since more than 1 should never exist per project
    }
    return result as DatabaseBackdrop[];
  }

  async addNewBackdrop(
    name: string,
    imagePaths: { costumeName: string; loadablePath: string }[],
    projectId: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `INSERT INTO backdrops (name, image_paths, project_id) VALUES (?, ?, ?)`,
          [name, JSON.stringify(imagePaths), projectId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  addNewSprite(
    name: string,
    imagePaths: { costumeName: string; loadablePath: string }[],
    projectId: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `INSERT INTO sprites (name, image_paths, project_id) VALUES (?, ?, ?)`,
          [name, JSON.stringify(imagePaths), projectId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  addCostumeToSprite(
    spriteId: number,
    oldImagePaths: { costumeName: string; loadablePath: string }[],
    imagePath: string,
    appDataDir: string,
    costumeName: string,
    isBackdrop: boolean,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const newImagePaths = [
          ...oldImagePaths,
          {
            costumeName: costumeName,
            loadablePath: convertFileSrc(`${appDataDir}/${imagePath}`),
          },
        ];
        await db.execute(
          `UPDATE ${isBackdrop ? "backdrops" : "sprites"} SET image_paths = ? WHERE id = ?`,
          [JSON.stringify(newImagePaths), spriteId],
        );
        console.log("Updated image paths for sprite:", spriteId);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateSpriteBlocksAndVariables(
    spriteId: number,
    blocksJson: any,
    variablesMap: any,
    isBackdrop: boolean,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `UPDATE ${isBackdrop ? "backdrops" : "sprites"} SET blocks_json = ?, variables_map = ? WHERE id = ?`,
          [JSON.stringify(blocksJson), JSON.stringify(variablesMap), spriteId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateSpriteName(spriteId: number, name: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(`UPDATE sprites SET name = ? WHERE id = ?`, [
          name,
          spriteId,
        ]);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
  deleteCostume(
    costumePath: string,
    currentCostumes: { costumeName: string; loadablePath: string }[],
    spriteId: number,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let newCostumes = currentCostumes.filter(
        (costume) => costume.loadablePath !== costumePath,
      );
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(`UPDATE sprites SET image_paths = ? WHERE id = ?`, [
          JSON.stringify(newCostumes),
          spriteId,
        ]);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  deleteVariableFromSprite(
    spriteId: number,
    variableId: string,
    isBackdrop: boolean,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const sprite = await db.select<DatabaseSprite[]>(
          `SELECT * from ${isBackdrop ? "backdrops" : "sprites"} WHERE id = ?`,
          [spriteId],
        );
        //@ts-ignore
        let variablesMap = JSON.parse(sprite[0].variables_map);
        variablesMap = variablesMap.filter(
          (variable: { id: string }) => variable.id !== variableId,
        );
        await db.execute(
          `UPDATE ${isBackdrop ? "backdrops" : "sprites"} SET variables_map = ? WHERE id = ?`,
          [JSON.stringify(variablesMap), spriteId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateProjectBroadcastMessages(
    projectId: number,
    messages: string[][],
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `UPDATE projects SET broadcasts_json = ? WHERE id = ?`,
          [JSON.stringify(messages), projectId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  getProjectBroadcastMessages(projectId: number): Promise<string[][]> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const result = await db.select<{ broadcasts_json: string }[]>(
          `SELECT broadcasts_json from projects WHERE id = ?`,
          [projectId],
        );
        if (result.length === 0) {
          resolve([]);
          return;
        }
        //@ts-ignore
        const messages = JSON.parse(result[0].broadcasts_json);
        resolve(messages);
      } catch (error) {
        reject(error);
      }
    });
  }

  addVariableToSprite(
    spriteId: number,
    variableId: string,
    variableName: string,
    isGlobal: boolean,
    isBackdrop: boolean,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const sprite = await db.select<DatabaseSprite[]>(
          `SELECT * from ${isBackdrop ? "backdrops" : "sprites"} WHERE id = ?`,
          [spriteId],
        );
        //@ts-ignore
        console.log("sprite", sprite, typeof sprite);
        if (sprite.length === 0) {
          reject(new Error("Sprite not found"));
          return;
        }
        //@ts-ignore
        let variablesMap = JSON.parse(sprite[0].variables_map);
        variablesMap.push({
          id: variableId,
          name: variableName,
          isGlobal: isGlobal,
        });
        await db.execute(
          `UPDATE ${isBackdrop ? "backdrops" : "sprites"} SET variables_map = ? WHERE id = ?`,
          [JSON.stringify(variablesMap), spriteId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  updateCostumeName(
    spriteId: number,
    currentCostumes: { costumeName: string; loadablePath: string }[],
    costumePath: string,
    newCostumeName: string,
    isBackdrop: boolean,
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      let newCostumes = currentCostumes.map((costume) => {
        if (costume.loadablePath === costumePath) {
          return { ...costume, costumeName: newCostumeName };
        }
        return costume;
      });
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `UPDATE ${isBackdrop ? "backdrops" : "sprites"} SET image_paths = ? WHERE id = ?`,
          [JSON.stringify(newCostumes), spriteId],
        );
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}
