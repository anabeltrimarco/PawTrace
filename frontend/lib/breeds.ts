export const DOG_BREEDS = [
  "Akita",
  "Beagle",
  "Border Collie",
  "Boston Terrier",
  "Boxer",
  "Bulldog Francés",
  "Bulldog Inglés",
  "Caniche",
  "Chihuahua",
  "Cocker Spaniel",
  "Dachshund",
  "Dálmata",
  "Dóberman",
  "Golden Retriever",
  "Husky Siberiano",
  "Labrador Retriever",
  "Maltés",
  "Pastor Alemán",
  "Pastor Australiano",
  "Pinscher",
  "Pitbull",
  "Pomerania",
  "Pug",
  "Rottweiler",
  "San Bernardo",
  "Schnauzer",
  "Shih Tzu",
  "Weimaraner",
  "Yorkshire Terrier",
  "Mestizo",
  "Otra",
  "Desconocida",
];

export const CAT_BREEDS = [
  "Abisinio",
  "Angora",
  "Azul Ruso",
  "Bengalí",
  "British Shorthair",
  "Maine Coon",
  "Persa",
  "Ragdoll",
  "Siamés",
  "Sphynx",
  "Mestizo",
  "Otra",
  "Desconocida",
];

export const OTHER_BREEDS = [
  "Otra",
  "Desconocida",
];

export function getBreedsBySpecies(
  species: string
) {
  switch (species) {
    case "Perro":
      return DOG_BREEDS;

    case "Gato":
      return CAT_BREEDS;

    default:
      return OTHER_BREEDS;
  }
}