const express = require('express');
const sql = require('mssql');

console.log(typeof jsonData);

// express.json() middleware'i, gelen isteklerin JSON formatındaki body'lerini otomatik olarak parse ediyor ve req.body içine yerleştiriyor.
const server = express();
server.use(express.json());


// Veritabanı bağlantısını açar. Benim veritabanım "freeasphosting.net"'de bulunuyor.
sql.connect(`Server=sql.bsite.net\\MSSQL2016;Database=mthnplt_; user id=mthnplt_;password=mete12345;TrustServerCertificate=True;`);


// Bu fonksiyonda istenildiği üzere bir kişinin bir dersten birden fazla notu varsa ortalaması alınıyor ve 1 tane olarak tutuluyor. Bu sayede bir kişinin her dersten tek notu oluyor.
function calculateAverageGrade(student) {
    const grades = {}; // Ders kodlarına göre notların saklandığı bir obje

    // Öğrencinin notlarını dolaş
    student.grades.forEach(grade => {
        const { code, value } = grade;

        // Eğer bu ders kodu daha önce görülmediyse, bir girdi oluştur ve ilk notu ekle
        if (!grades[code]) {
            grades[code] = {
                total: value,
                count: 1
            };
        } else {
            // Ders kodu zaten varsa, notu topla ve sayacı arttır
            grades[code].total += value;
            grades[code].count++;
        }
    });

    // Her ders kodu için ortalama hesapla ve sadece bir not bırak
    Object.keys(grades).forEach(code => {
        const avg = grades[code].total / grades[code].count;
        // Öğrencinin notlarında sadece bir tane olan dersleri bul
        const uniqueGradeIndex = student.grades.findIndex(grade => grade.code === code);
        // Eğer birden fazla not varsa, dersin tüm notlarını temizle ve sadece ortalama notu ekle
        if (grades[code].count > 1) {
            student.grades = student.grades.filter(grade => grade.code !== code);
            student.grades.push({ code, value: avg });
        }
    });

    return student;
}


// Kaydettiğim verilerin kontrolü yapabilmek için 
server.get('/', async (req, res) => {
    try {
        // Veritabanından tüm verileri al
        const result = await sql.query`SELECT * FROM zyfera2`;

        // grades verilerini ben string olarak tuttuğum için tekrar JSON tipine çevirdim.
        const data = result.recordset.map(item => ({
            ...item,
            grades: JSON.parse(item.grades)
        }));

        // Sonuçları JSON olarak gönder
        res.json(data);
    } catch (err) {
        console.error("Hata:", err);
        res.status(500).send("Sunucu hatası");
    }
});

server.use(express.json());

server.post('/', async (req, res) => {
    try {

        const students = req.body
        const item = calculateAverageGrade(students);

        // İlk olarak tabloyu oluştur (eğer yoksa)
        await sql.query`IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = N'zyfera2') BEGIN CREATE TABLE zyfera2 (name VARCHAR(255), surname VARCHAR(255),stdNumber VARCHAR(255),grades NVARCHAR(MAX)) END`;

        // Verilerin boş olup olmadığının kontrolü. Hatalıysa görmezden kaydetmeyecek ve kaydetmedi mesajını yazıcak.
        if (!item.name || !item.surname || !item.stdNumber || !item.grades) {
            console.error(`Hata: Eksik veri. Öğrenci: ${JSON.stringify(item)}`);

        }

        // Veri tiplerinin kontrolü. Hatalıysa görmezden kaydetmeyecek ve kaydetmedi mesajını yazıcak.
        if (typeof item.name !== 'string' || typeof item.surname !== 'string' || typeof item.stdNumber !== 'string' || !Array.isArray(item.grades)) {
            console.error(`Hata: Yanlış veri tipi. Öğrenci: ${JSON.stringify(item)}`);

        }

        // Burda grades i string tipine çevirdim çünkü kullandığım veritabamın JSON veri tipi kabul etmiyor. 
        await sql.query`INSERT INTO zyfera2 (name, surname, stdNumber, grades) VALUES (${item.name}, ${item.surname}, ${item.stdNumber}, ${JSON.stringify(item.grades)})`;

        console.log("Veri başarıyla eklendi.");
    } catch (err) {
        console.error("Hata:", err);
    }

    res.send("POST isteği alındı ve işlendi.");
});

server.listen(5000, () => {
    console.log(`localhost:5000 adresine gelen istekler dinleniyor.`);
});
