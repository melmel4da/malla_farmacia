document.addEventListener('DOMContentLoaded', function() {
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            // Clona los datos para poder modificarlos sin afectar el original cargado
            // Esto es importante porque el estado 'rendida' se actualizará en esta copia
            const asignaturasData = JSON.parse(JSON.stringify(data.asignaturas));
            const relacionesData = data.relaciones;

            // Transforma los datos de asignaturas al formato que vis.js necesita (nodos)
            const nodes = asignaturasData.map(asignatura => ({
                id: asignatura.id,
                label: asignatura.nombre,
                // Establece el color inicial basado en 'rendida'
                // vis.js usa un objeto para background y border
                color: asignatura.rendida ? { background: 'mediumpurple', border: 'mediumpurple' } : { background: 'lightskyblue', border: 'lightgray' },
                font: { color: asignatura.rendida ? 'white' : 'black' },
                shape: 'box', // Para que sean cajas
                margin: 10 // Espaciado interno de la caja
            }));

            // Transforma los datos de relaciones al formato que vis.js necesita (aristas/flechas)
            const edges = relacionesData.map(relacion => ({
                from: relacion.source,
                to: relacion.target,
                arrows: 'to', // Dibuja una flecha al final
                color: { color: '#848484' } // Color de las flechas
            }));

            // Crea los conjuntos de datos de vis.js. Estos son 'observables' y vis.js reacciona a sus cambios.
            const nodesDataset = new vis.DataSet(nodes);
            const edgesDataset = new vis.DataSet(edges);

            const container = document.getElementById('mynetwork'); // El <div> donde se dibujará la malla
            const curriculumData = {
                nodes: nodesDataset,
                edges: edgesDataset
            };

            const options = {
                nodes: {
                    shape: 'box', // Asegura que todos los nodos sean cajas
                    font: { size: 14, face: 'Arial' },
                    borderWidth: 1 // Borde inicial
                },
                edges: {
                    arrows: { to: { enabled: true, scaleFactor: 0.7 } }, // Flechas un poco más pequeñas
                    smooth: {
                        enabled: true,
                        type: "diagonalCross", // Tipo de línea de la flecha para un aspecto limpio
                        roundness: 0.5
                    }
                },
                layout: {
                    hierarchical: {
                        direction: 'LR', // Diseño de izquierda a derecha (Left-Right)
                        sortMethod: 'directed', // Ordena los nodos por sus dependencias
                        levelSeparation: 150 // Espacio horizontal entre niveles (semestres)
                    }
                },
                physics: {
                    enabled: false // Desactivamos la física para que los nodos no se muevan solos
                },
                interaction: {
                    dragNodes: true, // Permitir arrastrar nodos para reorganizar visualmente (no afecta la lógica)
                    zoomView: true, // Permitir zoom con la rueda del ratón
                    hover: true // Resaltar el nodo al pasar el ratón por encima
                }
            };

            const network = new vis.Network(container, curriculumData, options);

            // --- Funcionalidad de marcado y desbloqueo ---

            // Función principal para verificar y actualizar el estado visual de las asignaturas
            function actualizarEstadoAsignaturas() {
                // 1. Obtener la lista de todas las asignaturas que ya están marcadas como "rendidas"
                const asignaturasRendidas = nodesDataset.get({
                    filter: function (node) {
                        return node.color.background === 'mediumpurple'; // Filtra por el color de fondo púrpura
                    }
                }).map(node => node.id); // Solo nos interesa el ID de la asignatura rendida

                // 2. Iterar sobre cada nodo (asignatura) en la visualización
                nodesDataset.forEach(node => {
                    // Si la asignatura ya está marcada como rendida, no necesitamos recalcularla, salimos.
                    if (node.color.background === 'mediumpurple') {
                        return;
                    }

                    const nodeId = node.id;
                    // 3. Obtener todos los prerrequisitos (incluidos los correquisitos tratados como prerrequisitos)
                    // para la asignatura actual (nodeId).
                    const prerrequisitos = relacionesData
                        .filter(rel => rel.target === nodeId) // Filtra las relaciones donde esta asignatura es el 'target' (depende de)
                        .map(rel => rel.source); // Obtiene el 'source' (el prerrequisito) de esas relaciones

                    // 4. Verificar si TODOS los prerrequisitos de esta asignatura están en la lista de 'asignaturasRendidas'.
                    const todosPrerrequisitosRendidos = prerrequisitos.every(prereq => asignaturasRendidas.includes(prereq));

                    // 5. Determinar si la asignatura no tiene prerrequisitos (es de primer semestre o inicio de rama)
                    const noTienePrerrequisitos = prerrequisitos.length === 0;

                    // 6. Actualizar el color y borde del nodo basado en si se puede cursar o no
                    if (noTienePrerrequisitos || todosPrerrequisitosRendidos) {
                        // Se puede cursar: color celeste con un borde verde para resaltarla
                        nodesDataset.update({
                            id: nodeId,
                            color: { background: 'lightskyblue', border: 'green' }, // Fondo celeste, borde verde
                            font: { color: 'black' }, // Color de texto normal
                            borderWidth: 3 // Borde más grueso para indicar 'disponible'
                        });
                    } else {
                        // No se puede cursar aún: color celeste normal con borde gris
                        nodesDataset.update({
                            id: nodeId,
                            color: { background: 'lightskyblue', border: 'lightgray' }, // Fondo celeste, borde gris
                            font: { color: 'black' }, // Color de texto normal
                            borderWidth: 1 // Borde normal
                        });
                    }
                });
            }

            // Evento que se dispara cuando se hace clic en un nodo (asignatura)
            network.on('click', function (params) {
                // Verificar si se hizo clic en un nodo (y no en el espacio en blanco)
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0]; // Obtiene el ID del nodo clickeado
                    // No usamos nodesDataset.get(nodeId) directamente para cambiar 'rendida'
                    // porque queremos modificar nuestra copia local 'asignaturasData'
                    // que es la fuente de verdad de los estados.

                    // Encontrar la asignatura original en nuestra lista 'asignaturasData' por su ID
                    const asignaturaIndex = asignaturasData.findIndex(a => a.id === nodeId);
                    
                    if (asignaturaIndex !== -1) { // Asegurarse de que la asignatura fue encontrada
                        const asignatura = asignaturasData[asignaturaIndex];

                        // Alternar el estado 'rendida' de la asignatura (true a false, o false a true)
                        asignatura.rendida = !asignatura.rendida;

                        // Actualizar la apariencia del nodo en la visualización de vis.js
                        nodesDataset.update({
                            id: nodeId,
                            // Cambiar el color basado en el nuevo estado 'rendida'
                            color: asignatura.rendida ? { background: 'mediumpurple', border: 'mediumpurple' } : { background: 'lightskyblue', border: 'lightgray' },
                            font: { color: asignatura.rendida ? 'white' : 'black' }, // Color del texto
                            borderWidth: 1 // Restablece el borde a normal al marcar/desmarcar
                        });

                        // Después de cambiar el estado de una asignatura,
                        // debemos volver a verificar y actualizar el estado de TODAS las demás asignaturas
                        // para ver si alguna se ha desbloqueado o bloqueado.
                        actualizarEstadoAsignaturas();
                    }
                }
            });

            // Llamar a la función 'actualizarEstadoAsignaturas' una vez al inicio
            // para que los colores se muestren correctamente desde que se carga la página.
            actualizarEstadoAsignaturas();

        })
        .catch(error => console.error('Error cargando los datos:', error)); // Captura y muestra cualquier error al cargar data.json
});
