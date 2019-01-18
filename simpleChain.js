/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const db = require('./levelSandbox');

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
   this.hash = "",
   this.height = 0,
   this.body = data,
   this.time = 0,
   this.previousBlockHash = ""
 }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain{
  constructor(){
    this._addGenesisBlockIfNeeded();
  }

  // Add genesis block
  _addGenesisBlockIfNeeded() {
    return new Promise((resolve, reject) => {
      this.getBlockHeight().then((height) => {
        if(height==0) {
          let genesisBlock = new Block("First block in the chain - Genesis block");
          genesisBlock.time = new Date().getTime().toString().slice(0,-3);
          genesisBlock.hash = SHA256(JSON.stringify(genesisBlock)).toString();
          
          // add Genesis block to chain
          db.addLevelDBData(0, JSON.stringify(genesisBlock).toString())
          .then((genesisBlock) => {
            console.log('Added Genesis Block:');
            console.log(genesisBlock);
            resolve(genesisBlock);
          }).catch((err) => {
            console.log('Unable to add Genesis block!', err);
            reject(err);
          });
        } 
        resolve(true);
      }).catch((err) => {
        console.log('Unable to add Genesis Block!', err);
      });
    });
  }

  // Add new block
  addBlock(newBlock){
    return new Promise((resolve, reject) => {
      this._addGenesisBlockIfNeeded().then((value) => {
        this.getBlockHeight().then((height) => {
          this.getBlock(height-1).then((previousBlock) => {
            // Block height
            newBlock.height = height;
            // UTC timestamp
            newBlock.time = new Date().getTime().toString().slice(0,-3);
            // previous block hash
            newBlock.previousBlockHash = previousBlock.hash;
            // Block hash with SHA256 using newBlock and converting to a string
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            // Adding block object to chain
            db.addLevelDBData(newBlock.height, JSON.stringify(newBlock).toString())
            .then((newBlock) => {
              console.log('Added new Block: ', newBlock);
              resolve(newBlock);
            }).catch((err) => {
              console.log('Unable to add new block!', err);
              reject(err);
            });
          }).catch((err) => {
            reject('Unable to find previous block.', err);
          })
        }).catch((err) => {
          reject('Unable to get block height.', err);
        })
      })
    });
  }

  // Get block height
  getBlockHeight(){
    return new Promise((resolve, reject) => {
      db.getLevelDBTotalCount().then((height) => {
        resolve(height);
      }).catch((err) => {
        reject(err);
      })
    })
  }

    // get block
    getBlock(blockHeight){
      return new Promise((resolve, reject) => {
        db.getLevelDBData(blockHeight).then((blockData) => {
          resolve(JSON.parse(blockData));
        }).catch((err) => {
          console.log('Block not found!', err);
          reject(err);
        });
      });
    }

    // validate block
    validateBlock(blockHeight){
      var self = this;
      return new Promise(function(resolve, reject) {
        // get block object
        let block = self.getBlock(blockHeight).then((block) => {
          // get block hash
          let blockHash = block.hash;
          // remove block hash to test block integrity
          block.hash = '';
          // generate block hash
          let validBlockHash = SHA256(JSON.stringify(block)).toString();
          // Compare
          if (blockHash===validBlockHash) {
            resolve(true);
          } else {
            console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
            resolve(false);
          }
        }).catch((err) => {
          console.log('validateBlock: Unable to get block #' + blockHeight);
          reject(err);
        });
        
      });
    }

   // Validate blockchain
   validateChain(){
    var self = this;
    return new Promise(function(resolve, reject) {
      let errorLog = [];
      self.getBlockHeight().then((height) => {
        let blockValidations = [];
        for (var i = 0; i < height; i++) {
          let blockValidate = self.validateBlock(i).catch((err) => {
            errorLog.push(err);
          });
          blockValidations.push(blockValidate);
        }
        return Promise.all(blockValidations);
      }).then((results) => {
        if (errorLog.length>0) {
          console.log('Block errors = ' + errorLog.length);
          console.log('Blocks: '+ errorLog);
          reject(errorLog);
        } else {
          console.log('No errors detected');
          resolve(true);
        }
      }).catch((err) => {
        reject(err);
      });
    });

  }

  // Utility Method to Tamper a Block for Test Validation
  // This method is for testing purpose
  _modifyBlock(height, block) {
    let self = this;
    return new Promise( (resolve, reject) => {
      db.addLevelDBData(height, JSON.stringify(block).toString()).then((blockModified) => {
        resolve(blockModified);
      }).catch((err) => { console.log(err); reject(err)});
    });
  }

}


let myBlockChain = new Blockchain();
/******************************************
 ** Function for Create Tests Blocks   ****
 ******************************************/

( function theLoop (i) {
     setTimeout(function () {
        let blockTest = new Block("Test Block - " + (i + 1));
        myBlockChain.addBlock(blockTest).then((result) => {
            console.log(result);
            i++;
            if (i < 10) theLoop(i);
        }).catch((err) => {
          console.log('No errors detected' + err);
        });
    }, 10000);
  })(0);


/***********************************************
 ** Function to get the Height of the Chain ****
 ***********************************************/

/*myBlockChain.getBlockHeight().then((height) => {
  console.log(height);
}).catch((err) => { console.log(err);});
*/

/***********************************************
 ******** Function to Get a Block  *************
 ***********************************************/

/*myBlockChain.getBlock(0).then((block) => {
  console.log(JSON.stringify(block));
}).catch((err) => { console.log(err);});
*/

/***********************************************
 ***************** Validate Block  *************
 ***********************************************/
/*
myBlockChain.validateBlock(0).then((valid) => {
  console.log(valid);
}).catch((error) => {
  console.log(error);
});*/

/** Tampering a Block this is only for the purpose of testing the validation methods */

/*myBlockChain.getBlock(5).then((block) => {
  let blockAux = block;
  blockAux.body = "Tampered Block";
  myBlockChain._modifyBlock(blockAux.height, blockAux).then((blockModified) => {
    if(blockModified){
      myBlockChain.validateBlock(blockAux.height).then((valid) => {
        console.log(`Block #${blockAux.height}, is valid? = ${valid}`);
      })
      .catch((error) => {
        console.log(error);
      })
    } else {
      console.log("The Block wasn't modified");
    }
  }).catch((err) => { console.log(err);});
}).catch((err) => { console.log(err);});
myBlockChain.getBlock(6).then((block) => {
  let blockAux = block;
  blockAux.previousBlockHash = "jndininuud94j9i3j49dij9ijij39idj9oi";
  myBlockChain._modifyBlock(blockAux.height, blockAux).then((blockModified) => {
    if(blockModified){
      console.log("The Block was modified");
    } else {
      console.log("The Block wasn't modified");
    }
  }).catch((err) => { console.log(err);});
}).catch((err) => { console.log(err);});*/

/***********************************************
 ***************** Validate Chain  *************
 ***********************************************/

 /*myBlockChain.validateChain().then((errorLog) => {
  if(errorLog.length > 0){
    console.log("The chain is not valid:");
    errorLog.forEach(error => {
      console.log(error);
    });
  } else {
    console.log("No errors found, The chain is Valid!");
  }
}).catch((error) => {
  console.log(error);
});*/


