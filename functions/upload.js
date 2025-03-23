const { Dropbox } = require('dropbox');
const formidable = require('formidable');
const fs = require('fs');
const { Buffer } = require('buffer');

exports.handler = async function(event, context) {
    console.log("Funkcja została wywołana");

    if (event.httpMethod !== 'POST') {
        console.log("Nieprawidłowa metoda HTTP");
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Utworzenie tymczasowego pliku ze strumienia danych
        const tempDir = '/tmp'; // Netlify Functions pozwala na używanie /tmp
        const form = new formidable.IncomingForm({
            uploadDir: tempDir,
            keepExtensions: true,
            multiples: true,
        });

        // Przekształcenie base64 na buffer, aby móc wykorzystać form.parse()
        const bodyBuffer = Buffer.from(event.body, 'base64');
        const fakeReq = {
            headers: event.headers,
            body: bodyBuffer,
        };

        // Przetwarzanie formularza
        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(fakeReq, (err, fields, files) => {
                if (err) {
                    reject(err);
                } else {
                    resolve({ fields, files });
                }
            });
        });

        // Inicjalizacja Dropbox
        const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
        console.log("Dropbox zainicjowany");

        const guestName = fields['guest-name'].replace(/ /g, '_');
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
