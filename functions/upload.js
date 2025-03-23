const { Dropbox } = require('dropbox');
const fs = require('fs');

exports.handler = async function(event, context) {
    console.log("Funkcja została wywołana"); // Log 1

    if (event.httpMethod !== 'POST') {
        console.log("Nieprawidłowa metoda HTTP"); // Log 2
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Przetwarzanie danych formularza
        const boundary = event.headers['content-type'].split('boundary=')[1];
        const body = Buffer.from(event.body, 'base64').toString('binary');
        const parts = body.split(`--${boundary}`);

        const files = [];
        const fields = {};

        parts.forEach(part => {
            if (part.includes('filename="')) {
                // Przetwarzanie plików
                const filename = part.match(/filename="([^"]+)"/)[1];
                const fileContent = part.split('\r\n\r\n')[1].trim();
                files.push({
                    filename,
                    content: fileContent
                });
            } else if (part.includes('name="')) {
                // Przetwarzanie pól formularza
                const name = part.match(/name="([^"]+)"/)[1];
                const value = part.split('\r\n\r\n')[1].trim();
                fields[name] = value;
            }
        });

        const dbx = new Dropbox({ accessToken: process.env.DROPBOX_ACCESS_TOKEN });
        console.log("Dropbox zainicjowany"); // Log 3

        const guestName = fields['guest-name'].replace(/ /g, '_'); // Zamiana spacji na podkreślenia
        const guestEmail = fields['guest-email'];

        for (const file of files) {
            const fileName = `${guestName}_${file.filename}`; // Dodanie imienia i nazwiska do nazwy pliku
            console.log("Przesyłanie pliku:", fileName); // Log 4

            await dbx.filesUpload({
                path: `/aplikacje/wesele_kasia_michal/${fileName}`,
                contents: file.content
            });
            console.log("Plik przesłany:", fileName); // Log 5
        }

        console.log("Wszystkie pliki przesłane pomyślnie"); // Log 6
        return {
            statusCode: 200,
            body: 'Zdjęcia przesłane! Dziękujemy!'
        };
    } catch (err) {
        console.error("Błąd podczas przesyłania plików:", err); // Log 7
        return {
            statusCode: 500,
            body: 'Błąd przy przesyłaniu zdjęć'
        };
    }
};