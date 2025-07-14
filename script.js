document.addEventListener('DOMContentLoaded', function() {
    // 1. Cargamos los datos de las asignaturas y sus relaciones desde data.json
    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            const asignaturasData = JSON.parse(JSON.stringify(data.asignaturas)); // Clonamos los datos
            const relacionesData = data.relaciones;

            // 2. Mapeamos las asignaturas por su ID para un acceso rápido
            const asignaturasById = {};
            asignaturasData.forEach(asignatura => {
                asignaturasById[asignatura.id] = asignatura;
            });

            // 3. Obtenemos todos los elementos HTML de las asignaturas
            const materiaSlots = document.querySelectorAll('.materia-slot[data-id]');

            // 4. Función para actualizar el estado visual de todas las asignaturas
            function actualizarEstadoMalla() {
                // Obtener todos los IDs de las asignaturas que están marcadas como rendidas actualmente
                const rendidasActuales = [];
                materiaSlots.forEach(slot => {
                    const id = slot.dataset.id;
                    if (asignaturasById[id] && asignaturasById[id].rendida) {
                        rendidasActuales.push(id);
                    }
                });

                // Iterar sobre cada slot de materia en la malla
                materiaSlots.forEach(slot => {
                    const id = slot.dataset.id;
                    const asignatura = asignaturasById[id];

                    if (!asignatura) {
                        // Si el slot no corresponde a una asignatura real (ej. empty-slot), no hacemos nada
                        return;
                    }

                    // Remover clases de estado anteriores
                    slot.classList.remove('rendida', 'disponible', 'no-disponible');

                    if (asignatura.rendida) {
                        // Si la asignatura está rendida, le asignamos la clase 'rendida'
                        slot.classList.add('rendida');
                    } else {
                        // Si no está rendida, verificamos si está disponible para cursar
                        const prerrequisitos = relacionesData
                            .filter(rel => rel.target === id) // Obtener los prerrequisitos de esta asignatura
                            .map(rel => rel.source); // Quedarse solo con los IDs de los prerrequisitos

                        const todosPrerrequisitosRendidos = prerrequisitos.every(prereqId => rendidasActuales.includes(prereqId));
                        const noTienePrerrequisitos = prerrequisitos.length === 0;

                        if (noTienePrerrequisitos || todosPrerrequisitosRendidos) {
                            // Si se puede cursar, le asignamos la clase 'disponible'
                            slot.classList.add('disponible');
                        } else {
                            // Si no se puede cursar aún, le asignamos la clase 'no-disponible'
                            slot.classList.add('no-disponible');
                        }
                    }
                });
            }

            // 5. Añadir un 'EventListener' a cada slot de materia para el click
            materiaSlots.forEach(slot => {
                slot.addEventListener('click', function() {
                    const id = this.dataset.id; // Obtener el ID de la asignatura desde el atributo data-id
                    const asignatura = asignaturasById[id];

                    if (asignatura) { // Asegurarse de que sea una asignatura válida
                        asignatura.rendida = !asignatura.rendida; // Alternar el estado 'rendida'
                        actualizarEstadoMalla(); // Volver a actualizar toda la malla
                    }
                });
            });

            // 6. Ejecutar la función de actualización inicial al cargar la página
            actualizarEstadoMalla();

        })
        .catch(error => console.error('Error cargando los datos:', error));
});
