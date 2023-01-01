import { APIGatewayProxyHandler } from "aws-lambda";
import { compile } from "handlebars";
import { document } from "../utils/dynamodbClient";
import { join } from "path";
import { readFileSync } from "fs";
import dayjs from "dayjs";
import chromium from "chrome-aws-lambda";
import { S3 } from "aws-sdk";
import { v4 as uuidv4 } from "uuid";
import AWS from "aws-sdk";
const SES = new AWS.SES();

interface ICreateCertificate {
  name: string;
  email: string;
}

interface ITemplate {
  name: string;
  date: string;
  medal: string;
  id: string;
}

//==================== compila o template do hbs
const compileTemplate = async (data: ITemplate) => {
  const filePath = join(
    process.cwd(),
    "src",
    "templates",
    "certificate_visualization.hbs"
  );
  const html = readFileSync(filePath, "utf-8");
  return compile(html)(data);
};

export const handler: APIGatewayProxyHandler = async (event) => {
  //================= pega dados do request
  const { name, email } = JSON.parse(event.body) as ICreateCertificate;

  //================= cria id e verifica se já existe
  const idUser = uuidv4();

  const response = await document
    .query({
      TableName: "users_certificates",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": idUser,
      },
    })
    .promise();

  const userAlreadyExists = response.Items[0];

  //================== se não existir, salva metadados no dynamoDB
  !userAlreadyExists
    ? await document
        .put({
          TableName: "users_certificates",
          Item: {
            id: idUser,
            name,
            email: email,
            created_at: dayjs().format("DD/MM/YYYY"),
          },
        })
        .promise()
    : {
        statusCode: 409,
        message: "User already exists",
      };

  //================== faz o replace com as info no template
  const medalPath = join(process.cwd(), "src", "templates", "selo.png");
  const medal = readFileSync(medalPath, "base64");

  const data: ITemplate = {
    date: dayjs().format("DD/MM/YYYY"),
    id: idUser,
    name,
    medal: medal,
  };

  const content = await compileTemplate(data);

  const browser = await chromium.puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath,
  });

  const page = await browser.newPage();

  await page.setContent(content);

  const pdf = await page.pdf({
    format: "a4",
    landscape: true,
    printBackground: true,
    preferCSSPageSize: true,
    path: process.env.IS_OFFLINE ? "./certificate.pdf" : null,
  });

  await browser.close();

  //==================== salva o pdf do certificado no s3
  const s3 = new S3();

  await s3
    .putObject({
      Bucket: "bucket-certificate-ignite-serverless-rocketseat",
      Key: `${idUser}.pdf`,
      ACL: "public-read",
      Body: pdf,
      ContentType: "application/pdf",
    })
    .promise();

  //===================== envia e-mail com link do certificado
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Obrigado por visualizar meu post, aqui está o link para o seu certificado: https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${idUser}.pdf \nAtenciosamente, Arthur.`,
        },
      },
      Subject: {
        Data: "Certificado de visualização de postagem sobre lambda",
      },
    },
    Source: "thuur.vss@gmail.com",
  };

  try {
    await SES.sendEmail(params).promise();
    console.log({
      statusCode: 200,
      body: "Email enviado!",
    });
  } catch (e) {
    console.error(e);
    console.log({
      statusCode: 400,
      body: "Falha no envio do email.",
    });
  }

  return {
    statusCode: 201,
    body: JSON.stringify({
      message: "Certificado emitido com sucesso!",
      url: `https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${idUser}.pdf`,
    }),
  };
};
