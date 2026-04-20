La pagina web se basa, principalmente en automatizar los preoperacionales de la empresa (Los preoperacionales son prerequisitos que se evaluan para poder utilizar una maquina o equipo, si el equipo no cumple con alguno de esos requisitos basicos, los colaboradores no pueden manejar u operar con estas herramientas). Esto es lo centrar en la pagina web, los demas requerimientos ya son basados a la parte de la vista del administrador. 

Flujo de datos general
	El sistema maneja una arquitectura cliente-servidor compuesta por:
	Frontend: React + Axios
	Backend: Node.js + Express
	Base de datos: PostgreSQL

1. Flujo base de operación
	El usuario interactúa con la interfaz web.
	El frontend captura la acción y construye una solicitud HTTP.
	La solicitud se envía al backend mediante Axios.
	El backend valida autenticación, rol y estructura de datos.
	Si la solicitud es válida, se ejecutan consultas SQL sobre PostgreSQL.
	La base de datos retorna la información o confirma la operación.
	El backend responde al frontend con JSON.
	El frontend actualiza la interfaz en tiempo real según la respuesta.

2. Flujo de datos – Vista Administrador
2.1 Inicio de sesión del administrador
	El administrador ingresa número de documento y contraseña.
	El frontend envía POST /auth/login.
	El backend valida credenciales contra la tabla de usuarios.
	Si son correctas, genera un token JWT.
	El token y los datos del usuario se devuelven al frontend.
	El frontend almacena el token en localStorage.
	Según el rol detectado, el sistema redirecciona a la vista administrativa.
	Datos involucrados
	usuarios.numero_documento
	usuarios.password_hash
	roles.nombre
	token JWT

2.2 Creación de maquinaria
	El administrador diligencia el formulario de creación.
	El frontend valida que todos los campos obligatorios estén completos.
	Si se carga imagen, se envía primero a /uploads/photo.
	El backend almacena la imagen y devuelve foto_url.
	El frontend envía POST /maquinaria con:
		nombre
		serial
		marca
		modelo
		grupo_id
		formulario_id
		foto_url
	El backend valida con Zod.
	Verifica que el serial no esté duplicado.
	Genera automáticamente un qr_token.
	Inserta el registro en la tabla maquinaria.
	Devuelve la maquinaria creada al frontend.
	El frontend actualiza el listado y ya permite consultar el QR.
	Tablas involucradas
		maquinaria
		grupos_maquinaria
		formularios

2.3 Creación de usuarios
	El administrador diligencia el formulario de usuario.
	El frontend envía POST /usuarios.
	El backend valida estructura y unicidad de documento.
	Consulta el rol seleccionado.
	Genera contraseña cifrada.
	Inserta el usuario en la base de datos.
	Devuelve confirmación y datos del usuario creado.
	Tablas involucradas
		usuarios
		roles

2.4 Creación de formularios preoperacionales
	El administrador asigna nombre al formulario.
	Agrega preguntas dinámicamente.
	El frontend construye un arreglo de preguntas.
	Envía POST /formularios.
	El backend valida:
		nombre del formulario
		preguntas
		orden
		estado de activación
	Inserta el formulario y luego sus preguntas.
	Devuelve confirmación al frontend.
	El formulario queda disponible para asociarse a maquinaria.
	Tablas involucradas
		formularios
		formulario_preguntas

2.5 Creación y gestión de grupos
	El administrador crea o elimina grupos.
	El frontend consume las rutas de grupos.
	El backend valida nombre y restricciones.
	Si se intenta eliminar un grupo con maquinaria asociada, la operación se bloquea.
	Tablas involucradas
		grupos_maquinaria
		maquinaria

2.6 Consulta de colaboradores
	El administrador ingresa a la pestaña de colaboradores.
	El frontend solicita GET /usuarios?rol=colaborador.
	El backend consulta la base de datos.
	Devuelve la lista de colaboradores.
	El frontend los renderiza en cards con acciones:
		ver preoperacional
		editar
		eliminar
		Datos mostrados
			nombre
			cargo
			documento
			foto
			estado de acceso

2.7 Calendario de colaboradores
	El administrador selecciona “Ver preoperacional”.
	El frontend consulta el resumen mensual del colaborador.
	El backend construye el calendario día a día.
	Consulta:
		preoperacionales realizados
		días N/A
		días sin diligenciamiento
		Devuelve un objeto resumen por fecha.
	El frontend colorea el calendario:
		verde
		rojo
		amarillo
	Si el día es rojo, el administrador puede:
		enviar alerta
		marcar N/A
	Tablas involucradas
		preoperacionales
		novedades_preoperacional
		mensajes

2.8 Gestión de herramientas y equipos
	El administrador entra al módulo de maquinaria.
	El frontend consulta GET /maquinaria.
	Se aplican filtros:
		búsqueda por nombre / serial / marca
		grupo
		estado
	El backend arma la consulta SQL con filtros dinámicos.
	Devuelve la lista de maquinaria.
	El frontend muestra cards con estado visual.

2.9 Detalle de maquinaria
	El administrador selecciona una maquinaria.
	El frontend consulta:
		detalle general
		QR
		historial
		calendario
		preoperacionales
	El backend consulta múltiples tablas y responde con la información consolidada.
	El frontend permite:
		editar datos
		cambiar estado
		dar de baja
		revisar calendario
		gestionar fallos
		consultar historial
	Tablas involucradas
		maquinaria
		maquinaria_historial
		maquinaria_estado_dia
		maquinaria_eventos
		maquinaria_baja
		preoperacionales

2.10 Cambio de estado de maquinaria
	El administrador selecciona un nuevo estado.
	Debe ingresar observación obligatoria.
	El frontend envía PATCH /maquinaria/:id/estado.
	El backend:
		valida que no esté dada de baja
		actualiza maquinaria.estado
		registra historial
		registra estado diario
	El frontend refresca detalle y calendario.

2.11 Dar de baja maquinaria
	El administrador abre el modal de baja.
	Ingresa motivo, foto soporte y código de confirmación.
	El frontend envía POST /maquinaria/:id/baja.
	El backend:
		actualiza estado = dado_baja
		activa dado_baja = true
		registra fecha_baja
		inserta soporte en maquinaria_baja
		registra historial
		actualiza el estado del día
	El frontend bloquea edición y deja la máquina en modo solo lectura.

2.12 Alertas administrativas
	Alertas por fallos
	El frontend consulta /alertas/fallos.
	El backend consulta respuestas de preoperacionales donde cumple = false.
	Devuelve:
		maquinaria
		serial
		modelo
		colaborador
		ítem fallido
		foto
	El frontend muestra cards de alerta.
	Alertas por ausencia de preoperacional
	El frontend consulta /alertas/sin-preoperacional-hoy.
	El backend busca colaboradores activos sin registros del día.
	Devuelve la lista correspondiente.
	El administrador puede enviar alerta o marcar N/A.


2. Flujo de datos – Vista Colaborador

1.1 Inicio de sesión del colaborador
	El colaborador ingresa documento y contraseña.
	El frontend envía POST /auth/login.
	El backend valida las credenciales.
	Devuelve token y datos del usuario.
	El frontend identifica rol colaborador.
	Redirecciona al panel de colaborador.

1.2 Vista principal del colaborador
	El panel del colaborador contiene:
		iniciar preoperacional
		herramientas y equipos
		alertas
		perfil
		escanear QR (solo móvil)
	El frontend cambia de módulo por estado interno de navegación.

1.3 Búsqueda de maquinaria para preoperacional
	El colaborador accede a “Iniciar preoperacional”.
	El frontend consulta:
		grupos
		maquinaria disponible para colaborador
		El backend devuelve solo maquinaria visible para operación.
	Cada card se muestra según estado actual:
		verde: ya cumplió hoy
		azul: mantenimiento
		gris: no disponible
		no visible: dada de baja
	Si ya tiene preoperacional del día, la card queda bloqueada.
	Validaciones aplicadas
	no se muestra maquinaria dada de baja
	no se permite ingreso si ya existe preoperacional hoy
	no se permite ingreso si está en mantenimiento
	no se permite ingreso si está no disponible

1.4 Selección de maquinaria
	El colaborador hace clic sobre una máquina habilitada.
	El frontend solicita GET /maquinaria/colaborador/:id.
	El backend:
		consulta datos de la máquina
		consulta formulario asociado
		consulta preguntas activas
	Devuelve:
		datos de maquinaria
		formulario
		preguntas
	El frontend prepara el formulario con respuestas iniciales vacías.

1.5 Diligenciamiento del preoperacional
	El sistema muestra:
		fecha automática
		hora automática
		nombre de la maquinaria
		estado general calculado
	El colaborador abre el modal de preguntas.
	Responde una a una:
		cumple
		no cumple
		Si la respuesta es “No cumple”:
		debe adjuntar foto
		puede registrar observación
	El sistema calcula automáticamente el estado general:
		pendiente
		cumple
		no cumple con las condiciones mínimas

1.6 Validaciones antes de guardar
	Antes del envío, el frontend verifica:
	que todas las preguntas estén respondidas
	que si hay “No cumple”, exista evidencia fotográfica
	que si ubicación = campo, se haya escrito ciudad
	Si no se cumple alguna condición, no se permite guardar.

1.7 Registro del preoperacional
	El frontend envía POST /preoperacionales.
	El backend valida con Zod.
	Verifica:
		que la maquinaria exista
		que no esté dada de baja
		que no esté en mantenimiento
		que no esté no disponible
		que no exista ya un preoperacional hoy para esa maquinaria
	Inserta cabecera del preoperacional.
	Inserta respuestas.
	Si alguna respuesta falla:
		actualiza la maquinaria a no disponible
		registra historial
		Devuelve confirmación.
	El frontend bloquea la edición y redirecciona al inicio.
	Tablas involucradas
		preoperacionales
		preoperacional_respuestas
		maquinaria
		maquinaria_historial

1.8 Herramientas y equipos del colaborador
	El colaborador accede al módulo de herramientas.
	El frontend consulta la maquinaria visible.
	El backend devuelve listado filtrado.
	El frontend renderiza cards con foto y estado visual.
	Este módulo es de consulta, no de edición.

1.9 Perfil del colaborador
	El frontend toma los datos del usuario autenticado desde contexto.
	Se muestran en la vista de perfil.
	Puede ampliarse para edición controlada si se requiere en versiones futuras.

1.10 Alertas del colaborador
	El colaborador podrá visualizar las alertas o mensajes dirigidos a su usuario.
	Estas alertas pueden originarse por:
		omisión de preoperacional
		habilitación temporal

1.11 Escaneo QR
	En dispositivos móviles, el colaborador podrá abrir el escáner.
	Al leer el QR:
		se identifica el qr_token
		se consulta la maquinaria asociada
		se redirecciona al formulario correspondiente
	Esta funcionalidad complementa el flujo manual de búsqueda.

3. Reglas de negocio principales
	Para administrador
		puede crear, editar y desactivar recursos
		puede gestionar estados de maquinaria
		puede habilitar o cerrar flujos operativos
		puede consultar trazabilidad completa
	Para colaborador
		solo puede operar maquinaria habilitada
		solo puede registrar un preoperacional diario por máquina
		no puede editar una inspección una vez guardada
		debe adjuntar evidencia cuando exista falla

4. Resultado esperado del flujo
	El sistema garantiza que:
		cada máquina tenga trazabilidad diaria
		cada fallo quede soportado
		cada ausencia pueda justificarse
		el administrador tenga control operativo
		el colaborador siga un flujo restringido y validado
		la información quede almacenada y disponible para auditoría y seguimiento



Despues de este pequeño flujo de datos, te voy a mencionar el paso a paso para iniciar el proyecto de forma segura. 

Requisitos para iniciar/modificar el Proyecto: 

1. Debes de contar con node.js version 25.8.0

2. Si vas a utilizar la misma base de datos que esta en este equipo la contraseña de la base de datos es 
	Contraseña: Thor2026

3. Para iniciar proyectos de Backend para la ejecución del servidor de forma local debes de instalar las siguientes dependencias.
	npm init -y
	npm i express cors dotenv pg bcrypt jsonwebtoken multer qrcode zod
	npm i -D nodemon
	npm run dev

4. Para iniciar proyecto de Frontend para la ejecución del react de forma local debes de instalar las siguientes dependencias.
	npm créate vite@latest . -- --template react
	npm i axios react-router-dom @tanstack/react-query react-hook-form zod @hookform/resolevers
	npm run dev






Vista administrador Reportes de observacion.

Se creara una tab arriba de alertas donde diga reportes de observacion. Esta Tab tendra subtablas como en creacion. Las cuales son: 
1. Diligenciar Reporte: Aqui se vera un Formulario donde te Pide:
 Ciudad, 
 Lugar en la se observo la situacion, 
 La fecha es automatica, 
 OT (que es orden de trabajo) este es opcional, 
 Area (Aqui colocaras un select donde esten las areas de calidad, Diseño y desarrollo, Operacion, Otro(si marcan otro debe de aparecer un campo que diga cual))
 adjuntar registro fotografico(Funciona como todo lo anterior, si la pagina web se inicia en computador se abre el explorador de archivos pero si se hace atraves del telefono debe de dar la opcion de adjuntar archvo o fomar foto.)
Luego aparece un titulo que diga: Situacion observada y que aparezca las siguientes opciones: 
Incidente
Impacto ambiental, 
Error de informacion tecnica en el documento
Incumplimiento de parametros Tecnicos (PNC)
Acto seguro.
Acto Inseguro
Condicion segura, 
Acto Inseguro
Aparece otro apartado que diga: Descripcion de la situacion (Aqui es una espacio para que el administrador que diligencie el reporte mencione que fue lo que encontro) y eso seria todo del apartado de diligenciar Reporte. 

2. Luego reportes mensuales, donde en un calendario se pueda ver que dias del mes hubo reportes y que aparezca en gris si no hubo reportes, en rojo si hay reporte de observacion sin gestion administrativa(esta gestion administraiva es diferente a la de las fallas del preoperacional) Y  en color naranja los reportes de observación que ya se han cerrado es decir que ya tienen su gestion administrativa. aqui en este apartado debe de aparte haber un firltro para que me lleve a cierto mes de cierto año. Cuando un dia esta en naranja al darle clic se puede ver cual fue la gestion que se realizo. Cuando el dia este en rojo en el calendario al darle clic se debe poder hacer la gestion administrativa, donde el pueda Marcar el tipo de accion: R(Reparacion/Reproceso), R1(Reclasificacion), LB (Liberacion Bajo concesion), RE (Rechazo-descarte) y C(Cumplio), aparte de la descripcion de la accion, Y fecha en la que se hizo la gestion administrativa (Esta es automatica). 
en esta accion administrativa debe de haber unas condiciones que son las siguientes: 
	1. Si se realizo la gestion administrativa, debe de haber un boton que diga cerrar reporte de observacion, para que se de por solucionado el reporte y este 	quedara registrado en el calendario de color naranja. 
	2. Si se realizo la gestion administrativa pero debe de haber un boton que diga guardar proceso, Cuando le de clic debe de quedar en la calendario de color azul ya que no se cerro pero se hizo gestion administrativa.(Un reporte de observacion puede tener varias acciones administrativas).
	3. Si no se ha realizado la gestion administrativa, en el calendario se debe de ver el dia en rojo y poder acceder a la gestion administrativa especifica para los reportes de observacion. 
	Aparte de ello debajo del calendario debe de aparecer los reportes que estan sin cerrar, y un filtro de fecha a fecha, un filtro por areas, Por situacion observada y por quien lo reporto. 

3. En otra subtab deben de aparecer por años los resportes de observacion, es decir en este apartado aparecera como una especie de carpeta con el año en que los reportes se solucionaron, al darle clic al año deben de aparecer por mes las "carpetas" y aparte contar con los mismos filtros que te mencione antes y al abrir un mes debe de estar  el calendario de ese mes con los reportes de observacion cerrados.  Para recordarte que al momento de mostrar el reporte de observacion debe de aparecer el nombre de quien lo reporto, la cedula y el cargo, ademas pues del cuestionario como tal. 

4. En otra subtab deben de aparecer las instrucciones de como llenar un reporte de observacion. (Las tengo escritas jiji)

Vista del colaborador reportes de observacion
1. Panel principal del colaborador aparecera otro item que diga resportes de observacion donde ellos podran solo podran diligenciar esto con el mismo formato que te mencione al inicio, ademas del instrcutivo para diligenciar ello. 

Aparte ayudame a modificar el calendario de las herramientas y equipos; cuando se cierre o se acabe un mes se tendran 5 dias para gestionar los dias grises sino pasado este tiempo los dias grises vencidos ese mes pasan a ser d color amarillo mostrando que no se utilizo. pero solo las casillas grises sin gestionar 