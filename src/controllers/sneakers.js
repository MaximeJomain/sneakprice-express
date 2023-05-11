const axios = require("axios");
const { proxyList } = require("../utils/proxyList");

let selectedProxy = "";

exports.handler = async function (req, res) {
  const db = req.db;
  try {
    await fetchSneakersSales(db);
    res.send("Fonction 'fetchSneakersSales' exécutée avec succès");
  } catch (error) {
    console.error("Failed to fetch sneaker sales", error);
    res
      .status(500)
      .send("Une erreur est survenue lors de l'éxecution de la fonction.");
  }
};

// Sélectionne un proxy aléatoirement
async function selectProxy() {
  try {
    const response = await axios.get(
      "http://pubproxy.com/api/proxy?limit=1&format=txt&type=http&not_country=TWN&user_agent=true&referer=true"
    );
    const body = response.data;
    selectedProxy = {
      host: body.split(":")[0],
      port: body.split(":")[1],
    };
    console.log(`fetched proxy: ${JSON.stringify(selectedProxy)}`);
  } catch (error) {
    console.log(error);
    randomProxy = new URL(
      proxyList[Math.floor(Math.random() * proxyList.length)]
    );
    selectedProxy = {
      host: randomProxy.hostname,
      port: randomProxy.port,
    };
    console.log(`default proxy: ${JSON.stringify(selectedProxy)}`);
  }
}

// fonction pour récupérer les prix de ventes par taille avec un id de sneaker (stockX)
async function getProductPrices(id, proxy) {
  try {
    const response = await axios.get(
      `https://stockx.com/api/products/${id}?includes=market`,
      {
        proxy: proxy,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.4 Safari/605.1.15",
        },
      }
    );
    let json = response.data;
    const priceMap = Object.keys(json.Product.children).reduce((acc, key) => {
      const child = json.Product.children[key];
      if (child.market.lastSale === 0) return acc;

      let size = child.shoeSize;
      if (size[size.length - 1] === "W") {
        size = size.slice(0, -1);
      }

      acc[size] = child.market.lastSale;
      return acc;
    }, {});

    return priceMap;
  } catch (error) {
    throw new Error(`Failed to get product prices for id: ${id} ${error}`);
  }
}

async function fetchSneakersSales(db) {
  const inventoryRef = db.collection("inventory");
  const tableRef = db.collection("table");

  const querySnapshot = await inventoryRef.get();
  const sneakerIds = [
    ...new Set(querySnapshot.docs.map((doc) => doc.data().idModel)),
  ];
  console.log("Sneakers IDs", sneakerIds);

  let retries = 3;
  const timestampNow = new Date();

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const selectedProxy = await selectProxy();

      // Création d'un lot
      let batch = db.batch();

      // Création d'un tableau de Promesses
      const promises = sneakerIds.map(async (id) => {
        try {
          const result = await getProductPrices(id, selectedProxy);
          const tableDoc = tableRef.doc();
          const dataToInsert = {
            idModel: id,
            timestamp: timestampNow,
            sizePrice: result,
          };

          batch.set(tableDoc, dataToInsert);
          console.log(`Prepared sales data for sneaker ${id}`);
        } catch (error) {
          console.error(
            `Failed to fetch and prepare sales data for sneaker ${id}: ${error.message}`
          );
        }
      });

      await Promise.allSettled(promises);

      // Exécution de toutes les opérations d'écriture en une seule fois
      await batch.commit();
      break;
    } catch (error) {
      console.log(`Error calling API: ${error.message}`, error);
      if (attempt === retries - 1) {
        throw error;
      }
    }
  }
}

exports.getHistoryById = function (req, res) {
  const shoeId = req.params.id;

  // New balance 2002R
  const array1 = {
    idSize: "4d9f6441-f20c-4906-89e1-b0c4f48fe92f",
    "7 mars": "151",
    "14 mars": "145",
    "21 mars": "171",
    "28 mars": "225",
    "4 avril": "225",
    "11 avril": "225",
    "18 avril": "201",
    "25 avril": "180",
    "2 mai": "170",
    "9 mai": "181",
  };

  //Jordan 1 retro High OG
  const array2 = {
    idSize: "d0368968-12bf-4b20-9f69-fb7e0408b9b4",
    "Aout 22": "205",
    "Sept 22": "187",
    "Oct 22": "195",
    "Nov 22": "225",
    "Dec 22": "240",
    "Jan 23": "232",
    "Fev 23": "230",
    "Mars 23": "256",
    "Avr 23": "248",
    "Mai 23": "260",
  };

  // Jordan 4 Retro
  const array3 = {
    idSize: "59410744-c86e-4ba3-8565-9c3cdad2c253",
    "Mai 21": "313",
    "Aout 21": "360",
    "Dec 21": "431",
    "Avr 22": "438",
    "Aout 22": "435",
    "Oct 22": "412",
    "Dec 22": "420",
    "Jan 23": "476",
    "Mars 23": "477",
    "Mai 23": "462",
  };

  // Nike SB Dunk Low
  const array4 = {
    idSize: "01eb7378-06db-4b61-b39e-b44c24efb2c1",
    "20 avril": "504",
    "27 avril": "413",
    "3 mai": "335",
    "10 mai": "411",
  };

  const arrays = [array1, array2, array3, array4];

  let result = arrays.find((arr) => arr.idSize === shoeId) || null;

  res.json(result);
};
