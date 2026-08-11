const {
  checkAnimalReidHealth,
  compareAnimalImages,
} = require(
  "./src/services/animalReidService"
);

async function main() {
  console.log(
    "🔎 Verificando Animal Re-ID..."
  );

  const health =
    await checkAnimalReidHealth();

  console.log(
    "HEALTH:",
    health
  );

  const result =
    await compareAnimalImages(
      "http://127.0.0.1:5000/uploads/mascotas/1786206452981-354138237.jpeg",
      "http://127.0.0.1:5000/uploads/found-reports/1786229331896-826246200.jpeg"
    );

  console.log(
    "RESULTADO:",
    result
  );
}

main();