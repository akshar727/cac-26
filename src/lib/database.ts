import { DatabaseSprite } from "@/types/sprite";
import { convertFileSrc } from "@tauri-apps/api/core";
import Database from "@tauri-apps/plugin-sql";

export class DatabaseManager {
  private fileName = "cac.db";

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
        await db.execute(`UPDATE sprites SET image_paths = ? WHERE id = ?`, [
          JSON.stringify(newImagePaths),
          spriteId,
        ]);
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
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        await db.execute(
          `UPDATE sprites SET blocks_json = ?, variables_map = ? WHERE id = ?`,
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
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const sprite = await db.select<DatabaseSprite[]>(
          `SELECT * from sprites WHERE id = ?`,
          [spriteId],
        );
        //@ts-ignore
        let variablesMap = JSON.parse(sprite[0].variables_map);
        variablesMap = variablesMap.filter(
          (variable: { id: string }) => variable.id !== variableId,
        );
        await db.execute(`UPDATE sprites SET variables_map = ? WHERE id = ?`, [
          JSON.stringify(variablesMap),
          spriteId,
        ]);
        resolve();
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
  ): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await Database.load(`sqlite:${this.fileName}`);
        const sprite = await db.select<DatabaseSprite[]>(
          `SELECT * from sprites WHERE id = ?`,
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
        await db.execute(`UPDATE sprites SET variables_map = ? WHERE id = ?`, [
          JSON.stringify(variablesMap),
          spriteId,
        ]);
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
}
