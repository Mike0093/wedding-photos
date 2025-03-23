const { Dropbox } = require('dropbox');
const multiparty = require('multiparty');
const fs = require('fs');

exports.handler = async function(event, context) {
    console.log("Funkcja została wywołana"); // Log 1

    // Funkcja testowa
    if (event.httpMethod === 'GET') {
        console.log("Wywołano funkcję testową"); // Log 2
        return {
            statusCode: 200,
            body: 'Funkcja Netlify działa poprawnie!'
        };
    }

    if (event.httpMethod !== 'POST') {
        console.log("Nieprawidłowa metoda HTTP"); // Log 3
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const form = new multiparty.Form();
    const data = await new Promise((resolve, reject) => {
        form.parse(event, (err, fields, files) => {
            if (err) {
                console.error("Błąd podczas parsowania formularza:", err); // Log 4
                reject(err);
            } else {
                console.log("Formularz sparsowany pomyślnie"); // Log 5
                resolve({ fields, files });
            }
        });
    });

    const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
    console.log("Dropbox zainicjowany"); // Log 6

    try {
        const fileArray = data.files.photos;
        const guestName = data.fields['guest-name'][0].replace(/ /g, '_'); // Zamiana spacji na podkreślenia
        const guestEmail = data.fields['guest-email'][0];

        console.log("Przesyłane pliki:", fileArray); // Log 7

        for (const file of fileArray) {
            const content = fs.readFileSync(file.path);
            const fileName = `${guestName}_${file.originalFilename}`; // Dodanie imienia i nazwiska do nazwy pliku
            console.log("Przesyłanie pliku:", fileName); // Log 8

            await dbx.filesUpload({
                path: `/aplikacje/wesele_kasia_michal/${fileName}`,
                contents: content
            });
            console.log("Plik przesłany:", fileName); // Log 9

            fs.unlinkSync(file.path); // Usuń plik z serwera po uploadzie
            console.log("Plik usunięty z serwera:", fileName); // Log 10
        }

        console.log("Wszystkie pliki przesłane pomyślnie"); // Log 11
        return {
            statusCode: 200,
            body: 'Zdjęcia przesłane! Dziękujemy!'
        };
    } catch (err) {
        console.error("Błąd podczas przesyłania plików:", err); // Log 12
        return {
            statusCode: 500,
            body: 'Błąd przy przesyłaniu zdjęć'
        };
    }
};