const { Dropbox } = require('dropbox');
const formidable = require('formidable');
const fs = require('fs');

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
            maxFileSize: 50 * 1024 * 1024, // Limity na pliki - do 50MB
        });

        // Przetwarzanie formularza
        const { fields, files } = await new Promise((resolve, reject) => {
            const fakeReq = {
                headers: event.headers,
                body: Buffer.from(event.body, 'base64') // Zmieniamy ciało na Buffer
            };

            form.parse(fakeReq, (err, fields, files) => {
                if (err) reject(err);
                resolve({ fields, files });
            });
        });

        console.log("Formularz przetworzony", fields, files);

        const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
        console.log("Dropbox zainicjowany");

        const guestName = fields['guest-name'] ? fields['guest-name'].replace(/ /g, '_') : 'unknown_guest';
        const guestEmail = fields['guest-email'] || 'brak_emaila';

        // Przesyłanie plików do Dropbox
        const uploadPromises = Object.values(files).map(async (fileObj) => {
            const fileName = `${guestName}_${fileObj.originalFilename}`;
            console.log("Przesyłanie pliku:", fileName);

            try {
                const fileContent = fs.readFileSync(fileObj.filepath);
                const response = await dbx.filesUpload({
                    path: `/aplikacje/wesele_kasia_michal/${fileName}`,
                    contents: fileContent,
                });

                console.log("Plik przesłany do Dropbox:", fileName, response);
                
                // Usunięcie tymczasowego pliku
                fs.unlinkSync(fileObj.filepath);
            } catch (err) {
                console.error("Błąd przy przesyłaniu pliku:", fileName, err);
                throw err; // Rzucenie błędu zatrzyma dalsze przesyłanie
            }
        });

        // Czekamy na przesłanie wszystkich plików
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
