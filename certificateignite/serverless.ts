import type { AWS } from "@serverless/typescript";

const serverlessConfiguration: AWS = {
  service: "certificateignite",
  frameworkVersion: "3",
  plugins: [
    "serverless-esbuild",
    "serverless-dynamodb-local",
    "serverless-offline",
  ],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    region: "us-east-1",
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    stage: "dev",
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      MAIL_HOST: "${file(env.yml):${self:provider.stage}.MAIL_HOST}",
      MAIL_PORT: "${file(env.yml):${self:provider.stage}.MAIL_PORT}",
      MAIL_USER: "${file(env.yml):${self:provider.stage}.MAIL_USER}",
      MAIL_PASS: "${file(env.yml):${self:provider.stage}.MAIL_PASS}",
    },
    iam: {
      role: {
        statements: [
          { Effect: "Allow", Action: ["dynamodb:*"], Resource: ["*"] },
          { Effect: "Allow", Action: ["s3:*"], Resource: ["*"] },
        ],
      },
    },
  },
  package: { individually: false, include: ["./src/templates/**"] },
  functions: {
    generateCertificate: {
      timeout: 15,
      handler: "src/functions/generateCertificate.handler",
      events: [
        {
          http: {
            path: "generateCertificate",
            method: "post",
            cors: true,
          },
        },
      ],
    },
    generateCertificateVisualization: {
      handler: "src/functions/generateCertificateVisualization.handler",
      events: [
        {
          http: {
            path: "generateCertificateVisualization",
            method: "post",
            cors: true,
          },
        },
      ],
    },
    validateCertificate: {
      handler: "src/functions/validateCertificate.handler",
      events: [
        {
          http: {
            path: "validateCertificate/{id}",
            method: "get",
            cors: true,
          },
        },
      ],
    },
  },
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
      concurrency: 10,
      external: ["chrome-aws-lambda"],
    },
    dynamodb: {
      stages: ["dev", "local"],
      start: {
        inMemory: true,
        migrate: true,
        port: 8000,
      },
    },
  },
  resources: {
    Resources: {
      dbCertificateUsers: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "users_certificates",
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5,
          },
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "id",
              KeyType: "HASH",
            },
          ],
        },
      },
    },
  },
};

module.exports = serverlessConfiguration;
