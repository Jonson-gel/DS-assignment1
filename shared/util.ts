import { marshall } from "@aws-sdk/util-dynamodb";
import { Bike, Station } from "./types";

type Entity = Bike | Station;
export const generateItem = (entity: Entity) => {
  return {
    PutRequest: {
      Item: marshall(entity),
    },
  };
};

export const generateBatch = (data: Entity[]) => {
  return data.map((e) => {
    return generateItem(e);
  });
};
