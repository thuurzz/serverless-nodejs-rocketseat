import { APIGatewayProxyHandler } from "aws-lambda";
import { document } from "../utils/dynamodbClient";

interface ICertificate {
  name: string;
  id: string;
  created_at: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id } = event.pathParameters;

  const response = await document
    .query({
      TableName: "users_certificates",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  const userCertificate = response.Items[0] as ICertificate;

  return userCertificate
    ? {
        statusCode: 201,
        body: JSON.stringify({
          message: "Certificado válido!",
          name: userCertificate.name,
          date: userCertificate.created_at,
        }),
      }
    : {
        statusCode: 400,
        body: JSON.stringify({
          message: "Certificado não é válido!",
        }),
      };
};
