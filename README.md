# Guia del desenvolupador - flowio-core

Aquesta és la guia per a desenvolupadors del repositori flowio-core. 

## Dependències 🚩

- `pako`
- `xml2js`
- `lodash`

## Documentació 📖

La seqüència de crides de requeriments segueix la de submòduls: `electron.js` $\rightarrow$ `flowio.js`$\rightarrow$ `drawio-node.js`. 

#### `drawio-node.js` 

Aquesta llibreria és bàsicament una API per els fitxers de drawio, tal com drawio els guarda. Aquesta API ens donarà facilitat al llegir i escriure diagrames i llibreries de drawio. Esta desenvolupada quasi desde 0. Per tal d'entendre la necessitat d'aquesta llibreria, cal entendre quin format es guarden els diagrames de mxGraph:

- mxGraph comprimit

```{xml}
<mxfile modified="2019-06-01T06:55:24.253Z">
    <diagram id="aI8DmJniFy8GYhdvDRHG" name="Page-1">
        VrLVuM4EP2aLOH4nWRJAnQv0j1MM3NmyVF...
    </diagram>
</mxfile>    
```

- mxGraph descomprimit

  ```{xml
  <mxGraphModel dx="171" ...>
  	<root>
          <mxCell id="0"/>
  		<mxCell id="1" parent="0"/>
          <object flowio_key='name'>
              <mxCell id="kRyRl8HqRjgS" label="nom de la funció" parent="1">
                  <mxGeometry x="70" y="180" width="80" height="80" as="geometry"/>
              </mxCell>
          </object>
          ...
      </root>
  </mxGraphModel>
  ```

  Per tractar això desde javascript utilitzem [xml2js](https://www.npmjs.com/package/xml2js), que ens deixa un objecte d'aquest aspecte 

  ```{json}
  {
      mxGraphModel: {
          $: {dx:171,...},
          root: {...}
      }
  }
  ```

- `class mxObject`: és una classe que ajuda a treballar amb aquests objectes xml2js. 

  - `getProps`: retorna $

  - `getOriginal`: retorna l'objecte xml2js

  - `getType`: retorna el tipus

  - `getChildren`: retorna els fills

  - `changeProp`: canvia la propietat

  - `findChildrenRecursive`(*filter*: (props)=>(true/false)): troba si entre els descendents d'un mxObject hi ha algú que compleixi el filtre donat.

  - `findChildrenRecursiveObjectFilter` (*filter_obj*:{}): comprova si hi ha algun fill que tingui aquestes propietats.

    Distingim entre dos objectes especials mxObject: els que són arestes (edge) i els que són blocs simples (simpleBlock), que vol dir els que són de tipus mxCell i tenen com a fill una mxGeometry.

  - `getStyle`: ens dona l'estil d'un edge o un simpleBlock

  - `changeParent`: canvia el parent d'un simpleBlock

  - `changeGeometrySimpleBlock`: si és simpleBlock li canviem la x, y, amplada o llargada de la geometria.

  - `changeStyle`: canvia l'estil d'un edge o d'un simpleBlock

- `compress`: extreta de drawio, donat un string xml descomprimit el comprimeix

- `decompress`: extreta de drawio, donat un string xml comprimit el descomprimeix

- `parseStringDrawio`: retorna una `Promise` que contindrà l'objecte xml2js

- `toString`: genera l'string a partir d'un xml2js object.

- `getSimpleBlockFromLibrary`: donada llibreria i títol (clau), ens retorna tots els objectes que coincideixen.

- `modifySimpleBlock`: diverses funcions de mxObject agregades

- `getDiagramId`: retorna la id del diagrama

- `getDiagram`: uneix molts mxObjects per retornar un sol diagrama

- `findAllAndEdges`: retorna tots els objectes donat una llista de filtres (objectes) i els vèrtex que els connecten

- `readDiagram`: llegeix el diagrama, donada una ruta, retorna un mxObject i una id

#### `flowio.js`

Aquest és el principal punt d'accés al projecte. Utilitza les funcions de `drawio-node.js` per fer tot el I/O. Bàsicament s'encarrega de implementar la lògica pròpia del flowio: base de dades - funció - estudi. Això ho fa confiant que l'usuari fa servir uns diagrames especials. Les figures d'aquests diagrames que ens interessin aniràn marcades amb una clau `flowio_key`. Per exemple un bloc que representi el títol del diagrama, tindrà la clau `flowio_key:title` així la podrem detectar desde el codi. Aquests diagrames especials s'importaran automàticament com a llibreria de drawio. 

​	Funcions que serveixen per convertir un diagrama ja guardat en disc en una llibreria que puguem importar.

- `importLocalLibrariesWithoutDuplicates`(*load_func*, *file_path*): retorna una `Promise` que es resoldrà quan totes els diagrames de la ruta hagin estat importats com a llibreries de drawio, sense repeticions de id.

- `importLibraryFlowio`: importa la lllibreria de drawio que conté els diagrames especials (que està continguda dins el fitxer `flowio.js`). Aquesta conté els blocs principals per crear un diagrama de flowio: base de dades, funció i estudi. 

  Funcions per tal de crear un gran diagrama que conté els diversos nivells de informació

- `createFileIndex`(*path*): crear un índex de id's de diagrama i rutes

- `extractLogicFromFile`: executa `extractLogicFromFunction`, per una ruta donada i ho converteix en diagrama

- `extractLogicFromFunction`: extreu la part lògica de la funció o l'estudi (és a dir on es relacionen els blocs: inputs, outsputs, bases de dades, funcions). Si aquesta part lògica té altres funcions o estudis (que també tenen part lògica) extreu la part lògica d'aquests també ho afegeix en un sol diagrama, i així recursivament.3

## Bugs coneguts 🐛

1. Fem servir com a clau de tots els arxius el seu diagram_id, i no el seu ino (identificador únic del sistema) per suportar el copy-paste i els canvis d'unitat. Això però té dos problemes:
   - Si s'arrossega un diagrama ja crear a l'aplicació, quan es guardi aquell diagrama li haurà creat una altra id, per tant podem tenir dos id que representin el mateix diagrama. Cal evitar aquest ús.
   - Si es té un diagrama i es vol crear un altre diagrama, i es borra tot i es torna a començar amb el full en blanc, la id serà la mateixa que l'altre diagrama. La solució de moment és que no es pot importar dos diagrames amb la mateixa id com a llibreria.

