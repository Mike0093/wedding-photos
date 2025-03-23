const { Dropbox } = require('dropbox');
const multiparty = require('multiparty');
const fs = require('fs');

exports.handler = async function(event, context) {
    console.log("Funkcja została wywołana"); // Log 1

    if (event.httpMethod !== 'POST') {
        console.log("Nieprawidłowa metoda HTTP"); // Log 2
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const form = new multiparty.Form();
    const data = await new Promise((resolve, reject) => {
        form.parse(event, (err, fields, files) => {
            if (err) {
                console.error("Błąd podczas parsowania formularza:", err); // Log 3
                reject(err);
            } else {
                console.log("Formularz sparsowany pomyślnie"); // Log 4
                resolve({ fields, files });
            }
        });
    });

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
    console.log("Dropbox zainicjowany"); // Log 5

    try {
        const fileArray = data.files.photos;
        const guestName = data.fields['guest-name'][0].replace(/ /g, '_'); // Zamiana spacji na podkreślenia
        const guestEmail = data.fields['guest-email'][0];

        console.log("Przesyłane pliki:", fileArray); // Log 6

        for (const file of fileArray) {
            const content = fs.readFileSync(file.path);
            const fileName = `${guestName}_${file.originalFilename}`; // Dodanie imienia i nazwiska do nazwy pliku
            console.log("Przesyłanie pliku:", fileName); // Log 7

            await dbx.filesUpload({
                path: `/wesele/${fileName}`,
                contents: content
            });
            console.log("Plik przesłany:", fileName); // Log 8

            fs.unlinkSync(file.path); // Usuń plik z serwera po uploadzie
            console.log("Plik usunięty z serwera:", fileName); // Log 9
        }

        console.log("Wszystkie pliki przesłane pomyślnie"); // Log 10
        return {
            statusCode: 200,
            body: 'Zdjęcia przesłane! Dziękujemy!'
        };
    } catch (err) {
        console.error("Błąd podczas przesyłania plików:", err); // Log 11
        return {
            statusCode: 500,
            body: 'Błąd przy przesyłaniu zdjęć'
        };
    }
};