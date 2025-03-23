import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import Ajv from "ajv";
import schema from "../shared/types.schema.json";

const ajv = new Ajv();
const isValidBodyParams = ajv.compile(schema.definitions["Bike"] || {});

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const API_KEY = event.headers?.["x-api-key"];

    //check API Key
    const queryParams = event?.queryStringParameters;
    const apiKey = queryParams?.key;
    if (!apiKey || apiKey !== API_KEY) {
      return {
        statusCode: 403,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Forbidden: Invalid API Key" }),
      };
    }

    //read Body
    const body = event.body ? JSON.parse(event.body) : undefined;
    if (!body) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Bike update attributes are required" }),
      };
    }

    const { bikeId, ...updatableFields } = body;
    if (!bikeId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "bikeId is required" }),
      };
    }

    if (!isValidBodyParams(body)) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: "Incorrect type. Must match Bike schema",
          schema: schema.definitions["Bike"],
        }),
      };
    }

    const updateExpression = Object.keys(updatableFields)
      .map((key, index) => `#${key} = :value${index}`)
      .join(", ");

    const expressionAttributeNames: Record<string, string> = {};
    Object.keys(updatableFields).forEach((key) => {
      expressionAttributeNames[`#${key}`] = key;
    });

    const expressionAttributeValues: Record<string, any> = {};
    Object.entries(updatableFields).forEach(([key, value], index) => {
      expressionAttributeValues[`:value${index}`] = value;
    });

    await ddbDocClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME,
        Key: { bikeId: Number(bikeId) },
        UpdateExpression: `SET ${updateExpression}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "Bike updated successfully" }),
    };
  } catch (error: any) {
    console.error("[ERROR]", JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
      convertEmptyValues: true,
      removeUndefinedValues: true,
      convertClassInstanceToMap: true,
    },
    unmarshallOptions: { wrapNumbers: false },
  });
}
