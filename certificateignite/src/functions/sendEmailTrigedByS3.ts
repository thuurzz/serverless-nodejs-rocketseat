import { document } from "../utils/dynamodbClient";
import { s3 } from "../utils/s3Client";
import { ses } from "../utils/sesClient";

console.log("Loading function");

exports.handler = async (event, _context) => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  //================ busca uuid e nome do bucket que vem do certificado contido no evento.
  const idUser = decodeURIComponent(
    event.Records[0].s3.object.key.split(".")[0]
  );
  const nameBucket = decodeURIComponent(event.Records[0].s3.bucket.name);

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

  const getSingedUrl = async () => {
    const params = {
      Bucket: nameBucket,
      Key: `${idUser}.pdf`,
      Expires: 60 * 15,
    };
    try {
      const url = await new Promise((resolve, reject) => {
        s3.getSignedUrl("getObject", params, (err, url) => {
          err ? reject(err) : resolve(url);
        });
      });
      return url;
    } catch (err) {
      if (err) {
        console.log(err);
      }
    }
  };
  const urlPDF = await getSingedUrl();

  //=============== preenche as info para enviar e-mail
  const paramsSES = {
    Destination: {
      ToAddresses: [user.email, "thuur.vss@gmail.com"],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Olá! Obrigado por visualizar meu post. 
          \n O nome cadastrado por você, foi: ${user.name}. 
          \n Aqui está o link para o seu certificado, ele tem duração de 15 minutos: ${urlPDF}
          \n Obrigado e Até mais! Arthur.
          `,
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
