import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const translateClient = new TranslateClient({ region: process.env.REGION });
const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const { itemId, language, tableName } = event.queryStringParameters;
    if (!itemId || !language || !tableName) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing parameters" }),
      };
    }

    //read DynamoDB data
    const { Item } = await ddbDocClient.send(
      new GetCommand({
        TableName: tableName,
        Key: { id: parseInt(itemId) },
      })
    );

    if (!Item) {
      return { statusCode: 404, body: JSON.stringify({ message: "Item not found" }) };
    }

    if (Item.translations && Item.translations[language]) {
      return {
        statusCode: 200,
        body: JSON.stringify({ translation: Item.translations[language] }),
      };
    }

    //translate
    const translateCommand = new TranslateTextCommand({
      Text: Item.name,
      SourceLanguageCode: "en",
      TargetLanguageCode: language,
    });
    const translationResult = await translateClient.send(translateCommand);
    const translatedText = translationResult.TranslatedText;

    //update DynamoDB
    await ddbDocClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: parseInt(itemId) },
        UpdateExpression: "SET translations.#lang = :text",
        ExpressionAttributeNames: { "#lang": language },
        ExpressionAttributeValues: { ":text": translatedText },
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ translation: translatedText }),
    };
  } catch (error) {
    console.error("Error:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Internal Server Error" }) };
  }
};
