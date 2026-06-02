/* MAPBIOMAS FUEGO - COLECCIÓN 1 - SCRIPT DE PROCESAMIENTO
 *
 * Script para combinar (fusionar) múltiples versiones de imágenes de cicatrices de fuego
 * de regiones y años específicos en una nueva versión consolidada, y exportarlas
 * a una colección designada en Google Earth Engine.
 *
 * 📅 FECHA: 28 de julio de 2025
 *
 * EQUIPO:
 * Grupo de trabajo de mapeo de cicatrices de fuego - MapBiomas Fuego
 * - Instituto de Pesquisa Ambiental da Amazônia (IPAM)
 * - Wallace Silva y Vera Laisa
 *
 * -------------------------------------------------------------
 * 📌 ¿QUÉ HACE ESTE SCRIPT?
 * Este script está diseñado para facilitar la creación de nuevas versiones de datos
 * de cicatrices de fuego mediante la combinación de dos o más versiones existentes.
 * Su funcionalidad principal incluye:
 * 1. **Definición de Ruta Base**: Establece la ruta principal donde se encuentran
 * las colecciones de imágenes de origen y donde se guardarán las nuevas.
 * 2. **Configuración de Combinaciones**: Permite definir una lista de objetos,
 * donde cada objeto especifica:
 * - `version_name`: El nombre que tendrá la nueva imagen combinada (ej., 'v45').
 * - `output_path`: La ruta de la ImageCollection de destino para esta combinación.
 * - `assets_toMerge`: Una lista de los IDs completos de las imágenes fuente
 * que se combinarán para crear la nueva versión.
 * 3. **Fusión de Imágenes**: Para cada combinación definida:
 * - Inicializa una imagen vacía y luego "pega" las imágenes de origen una sobre otra.
 * - Utiliza un método de fusión que prioriza los valores quemados (`.where(img.gt(0), img)`),
 * asegurando que las áreas quemadas de todas las versiones se incluyan en la final.
 * 4. **Creación de Colecciones de Destino**: Antes de exportar, verifica si la
 * ImageCollection de destino para la imagen combinada existe. Si no existe, la crea.
 * 5. **Exportación de Imágenes Combinadas**: Exporta la imagen resultante de la fusión
 * a la ImageCollection especificada en Google Earth Engine.
 * 6. **Manejo de Duplicados (Opcional)**: Permite eliminar automáticamente una imagen
 * combinada existente en el destino antes de exportar una nueva versión con el mismo nombre,
 * evitando conflictos (controlado por `ELIMINA_SI_YA_EXISTE`).
 *
 * -------------------------------------------------------------
 * 🔧 ¿QUÉ DEBO MODIFICAR PARA USAR ESTE SCRIPT?
 * ✅ **`home`**: Ajusta la variable `home` a la ruta base de tus assets en Earth Engine.
 * ✅ **`images_to_process`**: **Esta es la sección más importante a modificar.**
 * - Rellena cada objeto en la lista con `version_name`, `output_path`, y la `assets_toMerge`
 * con los IDs de las imágenes que deseas combinar.
 * - Asegúrate de que las rutas dentro de `assets_toMerge` sean correctas.
 * ✅ **`ELIMINA_SI_YA_EXISTE`**: Cambia esta variable a `true` si deseas que el script
 * elimine automáticamente una imagen combinada existente con el mismo nombre en el destino
 * antes de exportar la nueva. Por defecto está en `false` para mayor seguridad.
 * ✅ **`pyramidingPolicy`**: Ajusta la política de piramidación en `Export.image.toAsset`
 * si `mode` no es adecuado para tus datos (otras opciones comunes son `mean`, `min`, `max`).
 * ✅ **`scale`**: Confirma que el `scale` (resolución) de exportación (30 metros por defecto)
 * coincide con la resolución original de tus datos para evitar reproyecciones indeseadas.
 *
 * -------------------------------------------------------------
 * ⚠️ RECOMENDACIÓN IMPORTANTE:
 * Debido a las operaciones de exportación y eliminación de assets, que requieren
 * confirmación manual en la ventana de Tareas de Earth Engine, se recomienda
 * **procesar las combinaciones de forma incremental**. Es decir, comenta o
 * elimina temporalmente las entradas en `images_to_process` que no estés
 * trabajando activamente para tener un mejor control.
 * -------------------------------------------------------------
 * 🖱️ NOTA SOBRE LAS OPERACIONES:
 * Por cada operación de exportación o eliminación, el navegador mostrará
 * una ventana emergente (pop-up) pidiendo confirmación manual en la pestaña
 * "Tasks" (Tareas) de Google Earth Engine. Asegúrate de aceptar o rechazar
 * según corresponda para cada asset.
 ***************************************************************/

// --- CONFIGURACIÓN DE RUTAS Y DATOS ---
// Ruta base donde se encuentran las imágenes y donde se guardarán las nuevas versiones.
var home = 'projects/mapbiomas-paraguay/assets/FIRE/COLLECTION1/CLASSIFICATION/';

// Variable de configuración para controlar la eliminación de assets existentes.
// Establece a 'true' para eliminar y reemplazar; 'false' para omitir la exportación si ya existe.
var ELIMINA_SI_YA_EXISTE = false; // Valor por defecto: false (seguro)

// --- LISTA DE IMÁGENES A PROCESAR Y COMBINAR ---
// Esta lista define cada tarea de combinación. Cada objeto representa
// una nueva imagen combinada que se creará a partir de las versiones listadas en 'assets_toMerge'.
var images_to_process = [
  {
    version_name:'burned_area_paraguay_l78_v45_region1_2013',
    output_path: home + 'combined_burned_area_paraguay_v45', // Nombre de la nueva colección para la imagen combinada
    assets_toMerge: [
      home + 'burned_area_paraguay_v4/burned_area_paraguay_l78_v4_region1_2013', // Ruta completa de la primera versión a combinar
      home + 'burned_area_paraguay_v5/burned_area_paraguay_l78_v5_region1_2013', // Ruta completa de la segunda versión a combinar
    ],
  },
  {
    version_name:'burned_area_paraguay_l78_v45_region1_2014',
    output_path: home + 'combined_burned_area_paraguay_v45', // Las combinaciones para el mismo "version_name" pueden ir en la misma colección de salida
    assets_toMerge: [
      home + 'burned_area_paraguay_v4/burned_area_paraguay_l78_v4_region1_2014',
      home + 'burned_area_paraguay_v5/burned_area_paraguay_l78_v5_region1_2014',
    ],
  },
  // Agrega más combinaciones aquí según necesites.
  // Cada entrada en esta lista resultará en una nueva imagen exportada.
  // {
  //   version_name:'nombre_de_tu_nueva_version',
  //   output_path: home + 'nombre_de_la_coleccion_de_salida',
  //   assets_toMerge: [
  //     home + 'ruta/completa/de/tu/asset_version_A',
  //     home + 'ruta/completa/de/tu/asset_version_B',
  //     // ... puedes añadir más assets aquí para combinar múltiples versiones
  //   ],
  // },
];


// 🚀 Iterar sobre la lista de objetos para combinar y exportar.
// Para cada objeto en 'images_to_process', se llama a la función 'combineAndExportVersions'.
images_to_process.forEach(combineAndExportVersions);


// --- FUNCIONES AUXILIARES ---

// 🔄 Función `createAssetIfNotExists(assetId)`
// Verifica si una ImageCollection con el 'assetId' dado ya existe en Earth Engine.
// Si no existe, la crea. Esto es crucial para asegurar que el destino de exportación
// esté listo antes de intentar guardar una imagen.
function createAssetIfNotExists(assetId) {
  try {
    ee.data.getAsset(assetId); // Intenta obtener información del asset.
    print('✅ La colección ya existe:', assetId); // Si tiene éxito, la colección existe.
  } catch (e) {
    // Si falla (ej. asset no encontrado), la colección no existe, entonces la crea.
    print('🆕 Creando colección:', assetId);
    ee.data.createAsset({type:'ImageCollection'}, assetId);
  }
}

// ⚙️ Función `combineAndExportVersions(obj)`
// Esta función principal toma un objeto de 'images_to_process' y realiza
// la lógica de combinación y exportación para una única tarea.
function combineAndExportVersions(obj) {
  // Extrae las propiedades del objeto de configuración.
  var version_name = obj.version_name; // Nombre de la imagen combinada (ej. 'burned_area_paraguay_l78_v45_region1_2013')
  var output_path = obj.output_path;   // Ruta de la ImageCollection de destino (ej. '.../combined_burned_area_paraguay_v45')
  var assets_toMerge = obj.assets_toMerge; // Lista de assets de origen a fusionar.

  // Construye el nombre completo del asset de salida.
  var output_name = output_path + '/' + version_name;

  print('Procesando combinación para:', ui.Label(version_name));

  // Asegura que la ImageCollection de destino existe antes de intentar exportar.
  createAssetIfNotExists(output_path);

  // Inicializa una imagen base con un solo pixel y una banda 'b1'.
  // Esto servirá como lienzo para "pegar" las imágenes quemadas.
  var image = ee.Image(0).rename('b1');

  // Itera sobre cada asset en la lista 'assets_toMerge'.
  assets_toMerge.forEach(function(asset){
    var img = ee.Image(asset); // Carga la imagen actual de la lista.
    // Combina la imagen actual con la 'image' base.
    // '.where(img.gt(0), img)' significa: donde los píxeles de 'img' sean mayores que 0 (es decir, quemados),
    // usa los valores de 'img'; de lo contrario, mantén los valores de 'image'.
    // Esto asegura que cualquier píxel quemado en cualquiera de las versiones se mantenga.
    image = image.where(img.gt(0), img);
  });

  // Obtiene la geometría y las propiedades de la primera imagen de la lista.
  // Esto es útil para establecer la región de exportación y copiar propiedades importantes.
  var _img = ee.Image(assets_toMerge[0]);
  var _bounds = _img.geometry().bounds(); // Extrae los límites geográficos de la imagen.

  // Realiza post-procesamiento en la imagen combinada:
  image = image.selfMask() // Enmascara los píxeles con valor 0 (no quemados), haciéndolos transparentes.
    .copyProperties(_img) // Copia las propiedades (ej. sistema de coordenadas, proyección) de la imagen original.
    .set({'version':version_name}); // Agrega una nueva propiedad 'version' con el nombre de la versión combinada.


  // --- LÓGICA DE EXPORTACIÓN ---
  try {
    // Intenta verificar si la imagen de salida (la combinación) ya existe en el destino.
    ee.data.getAsset(output_name);
    print('✅ Combinación ya existe en destino:', output_name);

    // Si la imagen ya existe y 'ELIMINA_SI_YA_EXISTE' es 'true', se elimina y se exporta la nueva.
    if (ELIMINA_SI_YA_EXISTE) {
      print('🗑️ Eliminando combinación existente antes de exportar:', output_name);
      ee.data.deleteAsset(output_name); // Elimina el asset existente.
      print('📤 Exportando nueva combinación:', output_name);
      Export.image.toAsset({ // Inicia la tarea de exportación.
        image: image,         // La imagen combinada a exportar.
        description: version_name, // Nombre de la tarea de exportación en la pestaña 'Tasks'.
        assetId: output_name,    // ID completo del asset de destino.
        pyramidingPolicy: 'mode', // Política de piramidación (cómo se agregan los píxeles a diferentes resoluciones). 'mode' es ideal para clasificaciones.
        region: _bounds,         // Región geográfica para la exportación.
        scale: 30,               // Resolución de salida en metros por píxel.
        maxPixels: 1e13,         // Límite de píxeles para evitar errores de memoria en exportaciones grandes.
      });
    } else {
      // Si la imagen existe y 'ELIMINA_SI_YA_EXISTE' es 'false', se omite la exportación.
      print('⏭️ Exportación de combinación omitida (ya existe y no se eliminará):', output_name);
    }

  } catch (e) {
    // Si el asset NO existe en el destino (el catch se activa), se exporta directamente.
    print('📤 Exportando nueva combinación (primera vez):', output_name);
    Export.image.toAsset({ // Inicia la tarea de exportación.
      image: image,
      description: version_name,
      assetId: output_name,
      pyramidingPolicy: 'mode',
      region: _bounds,
      scale: 30,
      maxPixels: 1e13,
    });
  }
}
