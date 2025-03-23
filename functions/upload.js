const formidable = require('formidable');
const fs = require('fs');
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  const form = new formidable.IncomingForm({
    uploadDir: '/tmp',
    keepExtensions: true,
    multiples: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB
  });

  return new Promise((resolve, reject) => {
    form.parse(event, async (err, fields, files) => {
      if (err) {
        console.error(err);
        reject({ statusCode: 500, body: 'Błąd przetwarzania plików.' });
        return;
      }

      const file = files.files[0];
      
      // Upewnij się, że plik jest w formacie binarnym (Buffer)
      const fileBuffer = fs.readFileSync(file.path);
      
      try {
        // Prześlij plik na Dropbox
        const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer YOUR_DROPBOX_ACCESS_TOKEN`,
            'Content-Type': 'application/octet-stream',
            'Dropbox-API-Arg': JSON.stringify({
              path: `/uploads/${file.name}`,
              mode: 'add',
              autorename: true,
            }),
          },
          body: fileBuffer,
        });

        if (!response.ok) {
          throw new Error('Błąd przesyłania do Dropbox');
        }

        resolve({
          statusCode: 200,
          body: 'Plik został pomyślnie przesłany do Dropbox.',
        });
      } catch (error) {
        console.error(error);
        reject({ statusCode: 500, body: 'Wystąpił błąd przy przesyłaniu pliku.' });
      }
    });
  });
};
