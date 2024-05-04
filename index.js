const express = require('express');
const sql = require('mssql');
const students = require('./data.js');

const server = express();

//---------------------------
// Bu fonksiyonda istenildiği üzere bir kişinin bir dersten birden fazla notu varsa ortalaması alınıyor ve 1 tane olarak tutuluyor. Bu sayede bir kişinin her dersten tek notu oluyor.
function calculateAverageGrade(studentsData) {
    studentsData.forEach(student => {
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
    });

    return studentsData;
}

// Ortalama notları hesapla
const studentsWithAverages = calculateAverageGrade(students);

//---------------------------

/*// Kaydettiğim verilerin kontrolü yapabilmek için 
server.get('/',async (req, res) => {
    try {
        // Veritabanı bağlantısını aç
        await sql.connect(`Server=sql.bsite.net\\MSSQL2016;Database=mthnplt_; user id=mthnplt_;password=mete12345;TrustServerCertificate=True;`);
        
        // Veritabanından tüm verileri al
        const result = await sql.query`SELECT * FROM zyfera`;

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
});*/

server.post('/', async (req, res) => {
    try {
        // Veritabanı bağlantısını açar. Benim veritabanım "freeasphosting.net"'de bulunuyor.
        await sql.connect(`Server=sql.bsite.net\\MSSQL2016;Database=mthnplt_; user id=mthnplt_;password=mete12345;TrustServerCertificate=True;`);
        
        // İlk olarak tabloyu oluştur (eğer yoksa)
        await sql.query`IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = N'zyfera') BEGIN CREATE TABLE zyfera (name VARCHAR(255), surname VARCHAR(255), grades NVARCHAR(MAX)) END`;

        // Tabloya veri ekliyorum. Note: JSON verisini string olarak kaydettim çünkü veritabanında JSON tipi tanımlı değil. 
        studentsWithAverages.forEach(async (item) => {
            await sql.query`INSERT INTO zyfera (name, surname, grades) VALUES (${item.name}, ${item.surname}, ${JSON.stringify(item.grades)})`;
        });

        console.log("Veri başarıyla eklendi.");
    } catch (err) {
        console.error("Hata:", err);
    }

    res.send("POST isteği alındı ve işlendi.");
});

server.listen(5000, () => {
    console.log(`localhost:5000 adresine gelen istekler dinleniyor.`);
});


