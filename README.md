# servless-nodejs-rocketseat

## Projeto desenvolvido no curso sobre lambda e serverless na plataforma Rocketseat.

### Você além dos exercícios propostos no curso encontrará:
- lambda que envia e-mail quando recebe evento do S3
- lambda que recebe json e cria PDF com certificado de visualização do post

### Para rodar
- Você deve utilizar: SERVERLESS FRAMEWORK
- Colocar suas credenciais
- Para rodar localmente as lambdas
```
yarn dynamodb:start 
```
```
yarn dev
```
- Para deploy no ambiente AWS
```
yarn deploy
```
### Arquitetura do projeto que está sendo integrado com o frontend

<img width="949" alt="Captura de Tela 2023-01-09 às 21 53 33" src="https://user-images.githubusercontent.com/53263896/211679248-27169bca-7181-46c6-abac-a52c9131b06b.png">

### Link para o frontend desenvolvido com NEXT.JS

[NEXT.JS Frontend](https://github.com/thuurzz/front-form-solicita-certificado-nextjs)
