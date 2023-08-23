import AWS from 'aws-sdk'
import { FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { extname } from 'node:path'
import { Readable } from 'node:stream'

export async function uploadRoutes(app: FastifyInstance) {
  // Configuração do AWS SDK
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_KEY_ID,
    region: process.env.AWS_REGION,
  })

  const s3 = new AWS.S3()

  app.post('/upload', async (request, reply) => {
    const upload = await request.file({
      limits: {
        fileSize: 5_242_880, // 5mb
      },
    })

    if (!upload) {
      return reply.status(400).send()
    }

    const mimeTypeRegex = /^(image|video)\/[a-zA-Z]+/
    const isValidFileFormat = mimeTypeRegex.test(upload.mimetype)

    if (!isValidFileFormat) {
      return reply.status(400).send()
    }

    const fileId = randomUUID()
    const extension = extname(upload.filename)
    const fileName = fileId.concat(extension)

    const fileBuffer = await upload.toBuffer()
    const fileStream = Readable.from(fileBuffer)

    const uploadParams = {
      Bucket: 'aws-spacetime-bucket',
      Key: fileName,
      Body: fileStream,
    }

    if (!uploadParams.Bucket) {
      return reply.status(500).send('Configurações do bucket estão faltando.')
    }

    // Realiza o upload para o S3
    try {
      await s3.upload(uploadParams).promise()

      const fileUrl = `${process.env.AWS_URL_BUCKET}/${fileName}`

      return { fileUrl }
    } catch (error) {
      console.error('Erro ao fazer o upload para o S3:', error)
      return reply.status(500).send('Erro ao fazer o upload do arquivo.')
    }
  })
}
