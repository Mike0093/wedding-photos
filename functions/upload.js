const { Dropbox } = require('dropbox');
const multiparty = require('multiparty');
const fs = require('fs');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const form = new multiparty.Form();
    const data = await new Promise((resolve, reject) => {
        form.parse(event, (err, fields, files) => {
            if (err) reject(err);
            else resolve({ fields, files });
        });
    });

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });

    try {
        const fileArray = data.files.photos;
        const guestName = data.fields['guest-name'][0].replace(/ /g, '_'); // Zamiana spacji na podkreślenia
        const guestEmail = data.fields['guest-email'][0];

        for (const file of fileArray) {
            const content = fs.readFileSync(file.path);
            const fileName = `${guestName}_${file.originalFilename}`; // Dodanie imienia i nazwiska do nazwy pliku
            await dbx.filesUpload({
                path: `/wesele/${fileName}`,
                contents: content
            });
            fs.unlinkSync(file.path); // Usuń plik z serwera po uploadzie
        }

        return {
            statusCode: 200,
            body: 'Zdjęcia przesłane! Dziękujemy!'
        };
    } catch (err) {
        console.error(err);
        return {
            statusCode: 500,
            body: 'Błąd przy przesyłaniu zdjęć'
        };
    }
};