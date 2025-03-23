const { Dropbox } = require('dropbox');
const multiparty = require('multiparty');
const fs = require('fs');
const { Readable } = require('stream');

exports.handler = async function(event, context) {
    console.log("Funkcja została wywołana");

    if (event.httpMethod !== 'POST') {
        console.log("Nieprawidłowa metoda HTTP");
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Utworzenie pseudo-req z event.body
    const buffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');

    const req = new Readable();
    req.push(buffer);
    req.push(null);

    // Potrzebne właściwości dla multiparty
    req.headers = {
        'content-type': event.headers['content-type'] || event.headers['Content-Type']
    };

    const form = new multiparty.Form();

    const data = await new Promise((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error("Błąd podczas parsowania formularza:", err);
                reject(err);
            } else {
                console.log("Formularz sparsowany pomyślnie");
                resolve({ fields, files });
            }
        });
    });

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
    console.log("Dropbox zainicjowany");

    try {
        const fileArray = data.files.photos;
        const guestName = data.fields['guest-name'][0].replace(/ /g, '_') || 'Gość';
        const guestEmail = data.fields['guest-email'] ? data.fields['guest-email'][0] : 'brak';

        console.log("Przesyłane pliki:", fileArray);

        for (const file of fileArray) {
            const content = fs.readFileSync(file.path);
            const fileName = `${guestName}_${file.originalFilename}`;
            console.log("Przesyłanie pliku:", fileName);

            await dbx.filesUpload({
                path: `/wesele/${fileName}`,
                contents: content
            });

            console.log("Plik przesłany:", fileName);

            fs.unlinkSync(file.path); // Usunięcie tymczasowego pliku
            console.log("Plik usunięty z serwera:", fileName);
        }

        console.log("Wszystkie pliki przesłane pomyślnie");
        return {
            statusCode: 200,
            body: 'Zdjęcia przesłane! Dziękujemy!'
        };
    } catch (err) {
        console.error("Błąd podczas przesyłania plików:", err);
        return {
            statusCode: 500,
            body: 'Błąd przy przesyłaniu zdjęć'
        };
    }
};
