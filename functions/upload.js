const { Dropbox } = require('dropbox');
const formidable = require('formidable');
const fs = require('fs');
const streamifier = require('streamifier');

exports.handler = async function(event, context) {
  console.log("Funkcja została wywołana");

  if (event.httpMethod !== 'POST') {
    console.log("Nieprawidłowa metoda HTTP");
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const tempDir = '/tmp'; // Netlify Functions pozwala na używanie /tmp
    const form = new formidable.IncomingForm({
      uploadDir: tempDir,
      keepExtensions: true,
      multiples: true,
    });

    // Konwersja event.body z base64 na Buffer
    const bodyBuffer = Buffer.from(event.body, 'base64');

    // Konwersja bufora na strumień przy użyciu streamifier
    const reqStream = streamifier.createReadStream(bodyBuffer);
    // Dodanie nagłówków do strumienia (wymagane przez formidable)
    reqStream.headers = event.headers;

    // Parsowanie danych formularza
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(reqStream, (err, fields, files) => {
        if (err) {
          return reject(err);
        }
        resolve({ fields, files });
      });
    });

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
    console.log("Dropbox zainicjowany");

    const guestName = fields['guest-name'].replace(/ /g, '_');
    // guestEmail jest tu nieużywany, ale można go ewentualnie wykorzystać
    const guestEmail = fields['guest-email'];

    // Przesyłanie plików do Dropbox
    const uploadPromises = Object.values(files).map(async (fileObj) => {
      const fileName = `${guestName}_${fileObj.originalFilename}`;
      console.log("Przesyłanie pliku:", fileName);

      const fileContent = fs.readFileSync(fileObj.filepath);

      await dbx.filesUpload({
        path: `/aplikacje/wesele_kasia_michal/${fileName}`,
        contents: fileContent
      });

      // Usunięcie tymczasowego pliku
      fs.unlinkSync(fileObj.filepath);
      console.log("Plik przesłany:", fileName);
    });

    await Promise.all(uploadPromises);
    console.log("Wszystkie pliki przesłane pomyślnie");

    return {
      statusCode: 200,
      body: 'Zdjęcia przesłane! Dziękujemy!'
    };
  } catch (err) {
    console.error("Błąd podczas przesyłania plików:", err);
    return {
      statusCode: 500,
      body: 'Błąd przy przesyłaniu zdjęć: ' + err.message
    };
  }
};
