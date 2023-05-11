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

/* exports.getHistoryById = function (req, res) {
    const shoeId = req.params.id
    const array1 = {
        "idSize": "4d9f6441-f20c-4906-89e1-b0c4f48fe92f",
        "03/23": "151",
        "03/23": "145",
        "03/23": "171",
        "03/23": "225",
        "04/23": "225",
        "04/23": "225",
        "04/23": "201",
        "04/23": "180",
        "04/23": "170",
        "04/23": "181",
        "04/23": "164",
        "04/23": "164",
        "05/23": "173",
        "05/23": "172",
    }

    const arrays = [array1]

    let result = arrays.filter(arr => arr.some(obj => obj.userId === userIdToFind));

    const dataArray = 

}
 */
