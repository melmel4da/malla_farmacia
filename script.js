document.addEventListener('DOMContentLoaded', function() {
    // Definición de colores de la paleta
    const COLORS = {
        RENDIDA: { background: '#B89DBB', border: '#B89DBB' }, // Pastel Purple
        DISPONIBLE: { background: '#F7C767', border: '#F3904B' }, // Orange-Yellow (Crayola) con borde Royal Orange
        NO_DISPONIBLE: { background: '#F7C767', border: '#F7C767' }, // Orange-Yellow (Crayola) para no cursadas y no disponibles
        TEXTO_RENDIDA: 'white',
        TEXTO_NO_RENDIDA: '#333' // Un gris oscuro para el texto
    };

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const asignaturasData = JSON.parse(JSON.stringify(data.asignaturas));
            const relacionesData = data.relaciones;

            const nodes = asignaturasData.map(asignatura => ({
                id: asignatura.id,
                label: asignatura.nombre,
                // Color inicial basado en si está rendida o no
                color: asignatura.rendida ? COLORS.RENDIDA : COLORS.NO_DISPONIBLE,
                font: { color: asignatura.rendida ? COLORS.TEXTO_RENDIDA : COLORS.TEXTO_NO_RENDIDA },
                shape: 'box',
                margin: 10,
                // Agregamos un 'title' para el tooltip al pasar el ratón, si quieres más detalles.
                title: asignatura.nombre
            }));

            const edges = relacionesData.map(relacion => ({
                from: relacion.source,
                to: relacion.target,
                arrows: 'to',
                color: { color: '#848484' }, // Color gris para las flechas
                width: 1 // Ancho de la flecha
            }));

            const nodesDataset = new vis.DataSet(nodes);
            const edgesDataset = new vis.DataSet(edges);

            const container = document.getElementById('mynetwork');
            const curriculumData = {
                nodes: nodesDataset,
                edges: edgesDataset
            };

            const options = {
                nodes: {
                    shape: 'box',
                    font: { size: 13, face: 'Arial' }, // Tamaño de fuente un poco más pequeño
                    borderWidth: 2, // Borde inicial
                    shadow: true, // Sombra para darle profundidad
                    scaling: {
                        label: {
                            enabled: true,
                            min: 12,
                            max: 18
                        }
                    }
                },
                edges: {
                    arrows: { to: { enabled: true, scaleFactor: 0.7 } },
                    smooth: {
                        enabled: true,
                        type: "diagonalCross", // Líneas más suaves
                        roundness: 0.5
                    },
                    color: { inherit: 'from' }, // Las flechas pueden heredar color del nodo origen si quieres destacarlas
                    width: 1.5 // Grosor de las líneas
                },
                layout: {
                    hierarchical: {
                        direction: 'LR', // De izquierda a derecha
                        sortMethod: 'directed', // Ordena las materias por sus dependencias
                        levelSeparation: 180, // Aumenta el espacio horizontal entre "semestres" para que no se superpongan
                        nodeSpacing: 100, // Espacio vertical entre nodos del mismo nivel
                        treeSpacing: 200, // Espacio entre árboles/ramas independientes
                        blockShifting: false, // Desactiva el shifting para mantener la cuadrícula
                        edgeMinimization: false, // Desactiva la minimización de bordes para una cuadrícula más clara
                        parentCentralization: false // No centrar padres para mantener posición
                    }
                },
                physics: {
                    enabled: false // Esencial para mantener la disposición fija y "cuadriculada"
                },
                interaction: {
                    dragNodes: true, // Se pueden arrastrar, pero volverán a su posición por el layout
                    zoomView: true,
                    hover: true,
                    tooltipDelay: 300 // Retraso para que aparezca el tooltip
                }
            };

            const network = new vis.Network(container, curriculumData, options);

            // --- Funcionalidad de marcado y desbloqueo ---

            function actualizarEstadoAsignaturas() {
                const asignaturasRendidas = nodesDataset.get({
                    filter: function (node) {
                        return node.color.background === COLORS.RENDIDA.background;
                    }
                }).map(node => node.id);

                nodesDataset.forEach(node => {
                    const nodeId = node.id;
                    // Si la asignatura ya está rendida, la mantenemos púrpura
                    if (asignaturasRendidas.includes(nodeId)) {
                        nodesDataset.update({
                            id: nodeId,
                            color: COLORS.RENDIDA,
                            font: { color: COLORS.TEXTO_RENDIDA },
                            borderWidth: 2,
                            borderColor: COLORS.RENDIDA.border // Borde del mismo color que el fondo para rendidas
                        });
                        return; // Pasa a la siguiente asignatura
                    }

                    // Para asignaturas no rendidas:
                    const prerrequisitos = relacionesData
                        .filter(rel => rel.target === nodeId)
                        .map(rel => rel.source);

                    const todosPrerrequisitosRendidos = prerrequisitos.every(prereq => asignaturasRendidas.includes(prereq));
                    const noTienePrerrequisitos = prerrequisitos.length === 0;

                    if (noTienePrerrequisitos || todosPrerrequisitosRendidos) {
                        // Se puede cursar: color Orange-Yellow con borde Royal Orange
                        nodesDataset.update({
                            id: nodeId,
                            color: COLORS.DISPONIBLE,
                            font: { color: COLORS.TEXTO_NO_RENDIDA },
                            borderWidth: 3 // Borde más grueso para indicar disponibilidad
                        });
                    } else {
                        // No se puede cursar aún: color Orange-Yellow normal
                        nodesDataset.update({
                            id: nodeId,
                            color: COLORS.NO_DISPONIBLE,
                            font: { color: COLORS.TEXTO_NO_RENDIDA },
                            borderWidth: 2 // Borde normal
                        });
                    }
                });
            }

            // Evento al hacer clic en un nodo
            network.on('click', function (params) {
                if (params.nodes.length > 0) {
                    const nodeId = params.nodes[0];
                    const asignaturaIndex = asignaturasData.findIndex(a => a.id === nodeId);

                    if (asignaturaIndex !== -1) {
                        const asignatura = asignaturasData[asignaturaIndex];

                        // Alterna el estado 'rendida'
                        asignatura.rendida = !asignatura.rendida;

                        // Actualiza el nodo en el DataSet de vis.js con el nuevo color y texto
                        // La actualización de color más detallada se hará en actualizarEstadoAsignaturas
                        nodesDataset.update({
                            id: nodeId,
                            // Los colores y bordes se gestionan mejor en la función actualizarEstadoAsignaturas
                            // Aquí solo garantizamos que el estado interno se actualice
                        });

                        // Vuelve a verificar qué asignaturas se pueden cursar después de este cambio
                        actualizarEstadoAsignaturas();
                    }
                }
            });

            // Llamar a la función al inicio para establecer el estado inicial
            actualizarEstadoAsignaturas();

        })
        .catch(error => console.error('Error cargando los datos:', error));
});
