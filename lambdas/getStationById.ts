import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const ddbDocClient = createDDbDocClient();
const translateClient = new TranslateClient({ region: process.env.REGION });

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const parameters = event?.pathParameters;
    const queryParams = event?.queryStringParameters;
    const stationId = parameters?.stationId ? parseInt(parameters.stationId) : undefined;
    const targetLanguage = queryParams?.language || "en";

    if (!stationId) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "Missing station Id" }),
      };
    }

    const commandOutput = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: { stationId },
      })
    );

    if (!commandOutput.Item) {
      return {
        statusCode: 404,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ Message: "Invalid station Id" }),
      };
    }

    let station = commandOutput.Item;

    if (station.translations && station.translations[targetLanguage]) {
      console.log(`Using cached translation for ${targetLanguage}`);
      station.name = station.translations[targetLanguage];
    } else {
      const translatedText = await translateText(station.name, targetLanguage);

      await ddbDocClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME,
          Key: { stationId },
          UpdateExpression: "SET translations.#lang = :translatedName",
          ExpressionAttributeNames: { "#lang": targetLanguage },
          ExpressionAttributeValues: { ":translatedName": translatedText },
        })
      );
      station.name = translatedText;
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: station }),
    };
  } catch (error: any) {
    console.log(JSON.stringify(error));
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error }),
    };
  }
};

async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text) return text;

  const command = new TranslateTextCommand({
    Text: text,
    SourceLanguageCode: "auto",
    TargetLanguageCode: targetLanguage,
  });

  const response = await translateClient.send(command);
  return response.TranslatedText || text;
}

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  const marshallOptions = {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  };
  const unmarshallOptions = {
    wrapNumbers: false,
  };
  const translateConfig = { marshallOptions, unmarshallOptions };
  return DynamoDBDocumentClient.from(ddbClient, translateConfig);
}
