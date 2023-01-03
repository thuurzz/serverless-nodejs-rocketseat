import { APIGatewayProxyHandler } from "aws-lambda";
import { ses } from "../utils/sesClient";

interface ICreateCertificate {
  name: string;
  email: string;
  idUser: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const { name, email, idUser } = JSON.parse(event.body) as ICreateCertificate;

  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: `Obrigado por visualizar meu post ${name}. 
          \nAqui está o link para o seu certificado: https://bucket-certificate-ignite-serverless-rocketseat.s3.amazonaws.com/${idUser}.pdf 
          \nAtenciosamente, Arthur.`,
        },
      },
      Subject: {
        Data: "Certificado de visualização de postagem sobre lambda",
      },
    },
    Source: "thuur.vss@gmail.com",
  };

  try {
    await ses.sendEmail(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email enviado!" }),
    };
  } catch (e) {
    console.error(e);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Falha no envio do email." }),
    };
  }
};
