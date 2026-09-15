/*
 * Function words dropped from the word cloud (docs/01). English and Spanish, because postings in
 * both languages are pasted. Nouns that carry meaning in a posting ("experience", "equipo") stay.
 */
const english = `
a about above after again against all also am an and any are as at be because been before being
below between both but by can could did do does doing down during each few for from further had
has have having he her here hers herself him himself his how i if in into is it its itself just
let me more most my myself no nor not now of off on once only or other our ours ourselves out over
own same she should so some such than that the their theirs them themselves then there these they
this those through to too under until up very was we were what when where which while who whom why
will with would you your yours yourself yourselves
also able across among another around become becomes being etc every get gets give given goes
going got however including may might must much need needs one ones per plus rather really
regarding said say see seen since something still take taken than thing things toward towards
upon use used using via want wants way well within without yet
`;

const spanish = `
a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el
ella ellas ellos en entre era erais eran eras eres es esa esas ese eso esos esta estaba estaban
estamos estan están estar estas este esto estos fue fueron fui fuimos ha había habían han has hasta
hay la las le les lo los mas más me mi mis mucho muchos muy nada ni no nos nosotros nuestra
nuestras nuestro nuestros o os otra otras otro otros para pero poco por porque que qué quien
quienes se sea sean ser será serán si sí sido siempre sin sobre somos son soy su sus también tanto
te tenemos tener tengo ti tiene tienen todo todos tu tus un una unas uno unos usted ustedes va vamos
van varios vos vosotros voy y ya yo
así aquí cada cómo debe deben demás dentro donde ese esta hacer hacia igual incluso luego mediante
mismo misma mismos mismas nuestro otra parte poder puede pueden pues según ser sino tras través
`;

/** Lowercase words the cloud ignores, in both languages. */
export const stopwords: ReadonlySet<string> = new Set(
  `${english} ${spanish}`.split(/\s+/).filter((word) => word.length > 0),
);
