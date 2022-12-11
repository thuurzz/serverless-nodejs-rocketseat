import { APIGatewayProxyHandler } from "aws-lambda";
import { compile } from "handlebars";
import { document } from "../utils/dynamodbClient";
import { join } from "path";
import { readFileSync } from "fs";
import * as dayjs from "dayjs";

interface IcreateCertificate {
  id: string;
  name: string;
  grade: string;
}

interface Itemplate {
  id: string;
  name: string;
  date: string;
  medal: string;
  grade: string;
}

const compileTemplate = async (data: Itemplate) => {
  const filePath = join(process.cwd(), "src", "templates", "certificates.hbs");

  const html = readFileSync(filePath, "utf-8");

  return compile(html)(data);
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const { id, name, grade } = JSON.parse(event.body) as IcreateCertificate;

  await document
    .put({
      TableName: "users_certificates",
      Item: {
        id,
        name,
        grade,
        created_at: new Date().getTime(),
      },
    })
    .promise();

  const response = await document
    .query({
      TableName: "users_certificates",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": id,
      },
    })
    .promise();

  const medalPath = join(process.cwd(), "src", "templates", "medal.png");

  const medal = readFileSync(medalPath, "base64");

  const data: Itemplate = {
    date: dayjs().format("DD/MM/YYYY"),
    grade,
    id,
    name,
    medal: medal,
  };

  const content = compileTemplate(data);

  return {
    statusCode: 201,
    body: JSON.stringify(response.Items[0]),
  };
};
