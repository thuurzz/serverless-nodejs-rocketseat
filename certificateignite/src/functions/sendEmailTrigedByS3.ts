import { document } from "../utils/dynamodbClient";
import { ses } from "../utils/sesClient";

console.log("Loading function");

exports.handler = async (event, _context) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  //================ busca uuid que vem do certificado contido no evento.
  const idUser = decodeURIComponent(
    event.Records[0].s3.object.key.split(".")[0]
  );

  //================ realiza busca no dynamo pelas info do usuário
  const response = await document
    .query({
      TableName: "users_certificates",
      KeyConditionExpression: "id = :id",
      ExpressionAttributeValues: {
        ":id": idUser,
      },
    })
    .promise();
  const user = response.Items[0];

  //=============== preenche as info para enviar e-mail
  const paramsSES = {
    Destination: {
      ToAddresses: [user.email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Obrigado por visualizar meu post ${user.name}. 
              \nAqui está o link para o seu certificado: https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${idUser}.pdf 
              \nAtenciosamente, Arthur.`,
        },
      },
      Subject: {
        Data: "Certificado visualização postagem AWS Lambda",
      },
    },
    Source: "thuur.vss@gmail.com",
  };

  //============== realiza envio de e-mail, usando SES
  try {
    await ses.sendEmail(paramsSES).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Sucesso no envio do email.",
        url: `https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${idUser}.pdf`,
      }),
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Falha no envio do email." }),
    };
  }
};
