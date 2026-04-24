/**
 * Ethiopia Location Data Utility
 * Contains hierarchical location data: Region/City -> Subcity -> Woreda/Kebele
 */

// Addis Ababa City Administration
const addisAbaba = {
  name: 'Addis Ababa',
  subcities: [
    {
      name: 'Addis Ketema',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10']
    },
    {
      name: 'Akaky Kaliti',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13', 'Woreda 14']
    },
    {
      name: 'Arada',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11']
    },
    {
      name: 'Bole',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13', 'Woreda 14']
    },
    {
      name: 'Gullele',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10']
    },
    {
      name: 'Kirkos',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11']
    },
    {
      name: 'Kolfe Keranio',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13']
    },
    {
      name: 'Lemi Kura',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12']
    },
    {
      name: 'Lideta',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10']
    },
    {
      name: 'Nifas Silk-Lafto',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13']
    },
    {
      name: 'Yeka',
      woredas: ['Woreda 1', 'Woreda 2', 'Woreda 3', 'Woreda 4', 'Woreda 5', 'Woreda 6', 'Woreda 7', 'Woreda 8', 'Woreda 9', 'Woreda 10', 'Woreda 11', 'Woreda 12', 'Woreda 13', 'Woreda 14']
    }
  ]
};

// Oromia Region - Major Cities
const oromia = {
  name: 'Oromia',
  cities: [
    {
      name: 'Adama (Nazret)',
      subcities: [
        { name: 'Adama City Center', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10'] },
        { name: 'Adama Rural', woredas: ['Adama Zuria', 'Boset', 'Dugda'] }
      ]
    },
    {
      name: 'Jimma',
      subcities: [
        { name: 'Jimma City Center', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10', 'Kebele 11', 'Kebele 12'] },
        { name: 'Jimma Zone', woredas: ['Limmu Kosa', 'Seka Chekorsa', 'Gomma', 'Gera', 'Sigmo'] }
      ]
    },
    {
      name: 'Ambo',
      subcities: [
        { name: 'Ambo Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08'] },
        { name: 'Ambo Zone', woredas: ['Toke Kutaye', 'Dendi', 'Ejerie', 'Welmera'] }
      ]
    },
    {
      name: 'Bishoftu (Debre Zeyit)',
      subcities: [
        { name: 'Bishoftu Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Bishoftu Zone', woredas: ['Akaki', 'Bora', 'Dugda', 'Gelan'] }
      ]
    },
    {
      name: 'Shashamane',
      subcities: [
        { name: 'Shashamane Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10'] },
        { name: 'West Arsi Zone', woredas: ['Shashamane Zuria', 'Kofele', 'Kokosa', ' Dodola'] }
      ]
    },
    {
      name: 'Nekemte',
      subcities: [
        { name: 'Nekemte Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08'] },
        { name: 'East Wellega Zone', woredas: ['Nekemte Zuria', 'Guto Gida', 'Sibu Sire', 'Leka Dulecha'] }
      ]
    },
    {
      name: 'Asella',
      subcities: [
        { name: 'Asella Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08'] },
        { name: 'Arsi Zone', woredas: ['Asella Zuria', 'Tena', 'Digeluna Tijo', 'Hitosa'] }
      ]
    },
    {
      name: 'Ziway (Batto)',
      subcities: [
        { name: 'Ziway Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'East Shewa Zone', woredas: ['Ziway Dugda', 'Bora', 'Adami Tulu', 'Arsi Negele'] }
      ]
    },
    {
      name: 'Woliso (Ghion)',
      subcities: [
        { name: 'Woliso Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Southwest Shewa Zone', woredas: ['Woliso Zuria', 'Becho', 'Waliso Zuria', 'Seden Sodo'] }
      ]
    },
    {
      name: 'Bale Robe',
      subcities: [
        { name: 'Robe Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Bale Zone', woredas: ['Robe Zuria', 'Goba', 'Dinsho', 'Ginir', 'Delo Menna'] }
      ]
    },
    {
      name: 'Other Oromia Zones',
      subcities: [
        { name: 'North Shewa Zone', woredas: ['Fiche', 'Kuyu', 'Gerar Jarso', 'Hidabu Abote'] },
        { name: 'East Hararghe Zone', woredas: ['Harar Zuria', 'Kersa', 'Bedeno', 'Meta', 'Girawa'] },
        { name: 'West Hararghe Zone', woredas: ['Chiro', 'Babile', 'Darolebu', 'Habro', 'Guba Koricha'] },
        { name: 'Borena Zone', woredas: ['Yabelo', 'Moyale', 'Arero', 'Dire', 'Arero'] },
        { name: 'Guji Zone', woredas: ['Shakiso', 'Bule Hora', 'Uraga', 'Odo Shakiso'] },
        { name: 'West Shewa Zone', woredas: ['Ambo', 'Jeldu', 'Dendi', 'Toke Kutaye', 'Ilu'] },
        { name: 'East Wellega Zone', woredas: ['Nekemte', 'Guto Gida', 'Sibu Sire', 'Leka Dulecha'] },
        { name: 'West Wellega Zone', woredas: ['Gimbi', 'Lalo Asabi', 'Ayra', 'Guliso', 'Haru'] },
        { name: 'Kelam Wellega Zone', woredas: ['Dembi Dollo', 'Dembidolo', 'Seyo', 'Gidami'] },
        { name: 'Illubabor Zone', woredas: ['Metu', 'Bedele', 'Bure', 'Nono', 'Ale'] },
        { name: 'Jimma Zone', woredas: ['Jimma', 'Limmu Kosa', 'Seka Chekorsa', 'Gomma', 'Gera'] },
        { name: 'West Arsi Zone', woredas: ['Shashamane', 'Kofele', 'Kokosa', 'Dodola', 'Nensebo'] }
      ]
    }
  ]
};

// Amhara Region
const amhara = {
  name: 'Amhara',
  cities: [
    {
      name: 'Bahir Dar',
      subcities: [
        { name: 'Bahir Dar City Center', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10', 'Kebele 11', 'Kebele 12'] },
        { name: 'Bahir Dar Zuria', woredas: ['Densa', 'Merawi', 'Woreteta', 'Tis Abay'] }
      ]
    },
    {
      name: 'Gondar',
      subcities: [
        { name: 'Gondar City Center', woredas: ['Adebabay', 'Zobel', 'Arada', 'Azezo', 'Maraki', 'Kidanemhret'] },
        { name: 'Gondar Zone', woredas: ['Mirab Dembia', 'Misraq Dembia', 'Wegera', 'Dabat', 'Debark'] }
      ]
    },
    {
      name: 'Mekelle (Tigray Capital)',
      subcities: [
        { name: 'Mekelle City Center', woredas: ['Kedamay Weyane', 'Hawelti', 'Adi Haki', 'Hadnet', 'Ayder', 'Quiha'] },
        { name: 'Mekelle Zone', woredas: ['Enderta', 'Qwiha', 'Wukro', 'Hawzen'] }
      ]
    },
    {
      name: 'Dessie',
      subcities: [
        { name: 'Dessie Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07'] },
        { name: 'South Wollo Zone', woredas: ['Dessie Zuria', 'Kutaber', 'Tenta', 'Legahida', 'Wereilu'] }
      ]
    },
    {
      name: 'Lalibela',
      subcities: [
        { name: 'Lalibela Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'North Wollo Zone', woredas: ['Lasta', 'Wadla', 'Delanta', 'Bugna'] }
      ]
    },
    {
      name: 'Debre Markos',
      subcities: [
        { name: 'Debre Markos Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'East Gojjam Zone', woredas: ['Debre Markos Zuria', 'Enarj Enawga', 'Menz Gera', 'Sinan'] }
      ]
    },
    {
      name: 'Debre Birhan',
      subcities: [
        { name: 'Debre Birhan Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'North Shewa Zone (Amhara)', woredas: ['Debre Birhan Zuria', 'Mojana Wadera', 'Termaber', 'Lemu', 'Hagere Mariam'] }
      ]
    },
    {
      name: 'Kombolcha',
      subcities: [
        { name: 'Kombolcha Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Dessie Zuria', woredas: ['Dessie Zuria', 'Kutaber', 'Tenta'] }
      ]
    },
    {
      name: 'Other Amhara Zones',
      subcities: [
        { name: 'Agew Awi Zone', woredas: ['Injibara', 'Guangua', 'Ankasha Guagusa', 'Jawi'] },
        { name: 'West Gojjam Zone', woredas: ['Finote Selam', 'Bure', 'Wonberma', 'Goncha Siso Enese', 'Quarit'] },
        { name: 'Awi Zone', woredas: ['Injibara', 'Guangua', 'Ankasha Guagusa'] },
        { name: 'South Gondar Zone', woredas: ['Debre Tabor', 'Dera', 'Farta', 'Ebenat'] },
        { name: 'North Gondar Zone', woredas: ['Gondar', 'Debark', 'Dabat', 'Metema', 'Wegera'] },
        { name: 'Wag Hemra Zone', woredas: ['Sekota', 'Ziquala', 'Dehana', 'Sehala'] },
        { name: 'Argoba Special Woreda', woredas: ['Argoba'] }
      ]
    }
  ]
};

// Tigray Region
const tigray = {
  name: 'Tigray',
  cities: [
    {
      name: 'Mekelle',
      subcities: [
        { name: 'Mekelle City Center', woredas: ['Kedamay Weyane', 'Hawelti', 'Adi Haki', 'Hadnet', 'Ayder', 'Quiha'] },
        { name: 'Mekelle Special Zone', woredas: ['Enderta', 'Qwiha', 'Wukro', 'Hawzen', 'Kilte Awlalo'] }
      ]
    },
    {
      name: 'Axum',
      subcities: [
        { name: 'Axum Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Central Zone', woredas: ['Axum Zuria', 'Adwa', 'Laelay Maychew', 'Naeder Adet'] }
      ]
    },
    {
      name: 'Adigrat',
      subcities: [
        { name: 'Adigrat Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Eastern Zone', woredas: ['Adigrat Zuria', 'Ganta Afeshum', 'Enticho', 'Atsbi'] }
      ]
    },
    {
      name: 'Shire (Inda Selassie)',
      subcities: [
        { name: 'Shire Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'North Western Zone', woredas: ['Shire Endaselassie', 'Asgede Tsimbla', 'Tahtay Koraro', 'Tahtay Adiyabo'] }
      ]
    },
    {
      name: 'Other Tigray Zones',
      subcities: [
        { name: 'Southern Zone', woredas: ['Maychew', 'Enderta', 'Raya Azebo', 'Alamata', 'Ofla'] },
        { name: 'South Eastern Zone', woredas: ['Wukro', 'Hawzen', 'Kilte Awlalo', 'Ganta Afeshum'] },
        { name: 'Western Zone', woredas: ['Kafta Humera', 'Wolqayt', 'Tsegede', 'Setit Humera'] }
      ]
    }
  ]
};

// SNNPR (Southern Nations, Nationalities, and Peoples Region)
const snnpr = {
  name: 'SNNPR',
  cities: [
    {
      name: 'Hawassa',
      subcities: [
        { name: 'Hawassa City Center', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10'] },
        { name: 'Hawassa Zuria', woredas: ['Hawassa Zuria', 'Yirgalem', 'Loka Abaya', 'Boricha', 'Aleta Wendo'] }
      ]
    },
    {
      name: 'Sodo',
      subcities: [
        { name: 'Sodo Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Wolaita Zone', woredas: ['Sodo Zuria', 'Boditi', 'Humbo', 'Kindo Koysha', 'Damot Weyde'] }
      ]
    },
    {
      name: 'Arba Minch',
      subcities: [
        { name: 'Arba Minch Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Gamo Gofa Zone', woredas: ['Arba Minch Zuria', 'Mirab Abaya', 'Kemba', 'Chencha', 'Bonke'] }
      ]
    },
    {
      name: 'Dilla',
      subcities: [
        { name: 'Dilla Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Gedeo Zone', woredas: ['Dilla Zuria', 'Yirgachefe', 'Wenago', 'Kochere', 'Bule'] }
      ]
    },
    {
      name: 'Jinka',
      subcities: [
        { name: 'Jinka Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'South Omo Zone', woredas: ['Jinka', 'Turmi', 'Dimeka', 'Key Afer', 'Bena Tsemay'] }
      ]
    },
    {
      name: 'Hosaena',
      subcities: [
        { name: 'Hosaena Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Hadiya Zone', woredas: ['Hosaena Zuria', 'Lemo', 'Shashogo', 'Duna', 'Soro'] }
      ]
    },
    {
      name: 'Wolaita Sodo',
      subcities: [
        { name: 'Wolaita Sodo Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Wolaita Zone', woredas: ['Sodo Zuria', 'Boditi', 'Humbo', 'Kindo Koysha'] }
      ]
    },
    {
      name: 'Other SNNPR Zones',
      subcities: [
        { name: 'Sidama Zone', woredas: ['Awassa', 'Yirgalem', 'Aleta Wendo', 'Hawassa Zuria', 'Boricha', 'Loka Abaya'] },
        { name: 'Gurage Zone', woredas: ['Wolkite', 'Endegagn', 'Ezha', 'Geta', 'Cheha'] },
        { name: 'Silte Zone', woredas: ['Worabe', 'Alaba Kulito', 'Tora', 'Lemo', 'Dalocha'] },
        { name: 'Kembata Tembaro Zone', woredas: ['Durame', 'Kacha Bira', 'Tembaro', 'Doyo Gena'] },
        { name: 'Burji Zone', woredas: ['Segen Zone', 'Konso', 'Derashe', 'Alle'] },
        { name: 'Basketo Zone', woredas: ['Basketo', 'Ela', 'Guba'] },
        { name: 'Konta Zone', woredas: ['Konta', 'Kokosa', 'Gayo'] },
        { name: 'Dawro Zone', woredas: ['Tarcha', 'Loma', 'Isara', 'Tocha'] },
        { name: 'Keffa Zone', woredas: ['Bonga', 'Chena', 'Gesha', 'Sayilem', 'Keffa'] }
      ]
    }
  ]
};

// Dire Dawa City Administration
const direDawa = {
  name: 'Dire Dawa',
  subcities: [
    {
      name: 'Dire Dawa City Center',
      woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10']
    },
    {
      name: 'Dire Dawa Rural',
      woredas: ['Gurgura', 'Melka Jebdu', 'Goro Baqaqsa']
    }
  ]
};

// Harari Region
const harari = {
  name: 'Harari',
  cities: [
    {
      name: 'Harar',
      subcities: [
        { name: 'Harar City Center', woredas: ['Abadir', 'Amir-Nur', 'Aw-Barkhadle', 'Dire Teyara', 'Erer', 'Feres Magala', 'Hakim', 'Jugol', 'Rohgo', 'Shenkor'] },
        { name: 'Harar Rural', woredas: ['Erer', 'Dire Teyara'] }
      ]
    }
  ]
};

// Afar Region
const afar = {
  name: 'Afar',
  cities: [
    {
      name: 'Semera',
      subcities: [
        { name: 'Semera City', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Awash Zone', woredas: ['Awash', 'Gewane', 'Amibara', 'Argoba'] }
      ]
    },
    {
      name: 'Dire Dawa (Afar side)',
      subcities: [
        { name: 'Gurgura Zone', woredas: ['Gurgura', 'Afdem', 'Gawa'] }
      ]
    },
    {
      name: 'Logia',
      subcities: [
        { name: 'Logia Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03'] },
        { name: 'Zone 1', woredas: ['Asayita', 'Chifra', 'Dubti', 'Afambo'] }
      ]
    },
    {
      name: 'Other Afar Zones',
      subcities: [
        { name: 'Zone 2', woredas: ['Mille', 'Gawa', 'Dawe', 'Hadeleala'] },
        { name: 'Zone 3', woredas: ['Bure', 'Ewa', 'Gulina', 'Telalak'] },
        { name: 'Zone 4', woredas: ['Yallo', 'Gawwada', 'Awra'] },
        { name: 'Zone 5', woredas: ['Dallol', 'Berhale', 'Koneba'] }
      ]
    }
  ]
};

// Somali Region
const somali = {
  name: 'Somali',
  cities: [
    {
      name: 'Jijiga',
      subcities: [
        { name: 'Jijiga City', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Fafan Zone', woredas: ['Jijiga', 'Awbare', 'Babile', 'Kebri Dahar'] }
      ]
    },
    {
      name: 'Kebri Dehar',
      subcities: [
        { name: 'Kebri Dehar Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04'] },
        { name: 'Korahe Zone', woredas: ['Kebri Dahar', 'Shilavo', 'Boh', 'Werder'] }
      ]
    },
    {
      name: 'Gode',
      subcities: [
        { name: 'Gode Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03'] },
        { name: 'Shabelle Zone', woredas: ['Gode', 'Kelafo', 'Mustahil', 'Ferfer'] }
      ]
    },
    {
      name: 'Degehabur',
      subcities: [
        { name: 'Degehabur Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03'] },
        { name: 'Jarar Zone', woredas: ['Degehabur', 'Aware', 'Gashamo', 'Boh'] }
      ]
    },
    {
      name: 'Other Somali Zones',
      subcities: [
        { name: 'Liben Zone', woredas: ['Dolo', 'Dolo Ado', 'Filtu', 'Goray'] },
        { name: 'Dawa Zone', woredas: ['Moyale', 'Hudet', 'Guradamole', 'Mubarak'] },
        { name: 'Nogob Zone', woredas: ['Fik', 'Degehabur', 'Gashamo', 'Hartishiek'] },
        { name: 'Siti Zone', woredas: ['Shinile', 'Dire Dawa', 'Afdem', 'Gota-Ber'] }
      ]
    }
  ]
};

// Gambela Region
const gambela = {
  name: 'Gambela',
  cities: [
    {
      name: 'Gambela City',
      subcities: [
        { name: 'Gambela Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Gambela Zone', woredas: ['Gambela', 'Gog', 'Jor', 'Lare'] }
      ]
    },
    {
      name: 'Other Zones',
      subcities: [
        { name: 'Agnewak Zone', woredas: ['Dima', 'Dabat', 'Mandi', 'Bonga'] },
        { name: 'Nuwer Zone', woredas: ['Wanthoa', 'Akobo', 'Jikawo'] },
        { name: 'Mezhenger Zone', woredas: ['Godere', 'Mengeshi'] }
      ]
    }
  ]
};

// Benishangul-Gumuz Region
const benishangul = {
  name: 'Benishangul-Gumuz',
  cities: [
    {
      name: 'Assosa',
      subcities: [
        { name: 'Assosa Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Assosa Zone', woredas: ['Assosa', 'Bambasi', 'Menge', 'Kamashi', 'Homosha'] }
      ]
    },
    {
      name: 'Kamashi',
      subcities: [
        { name: 'Kamashi Zone', woredas: ['Kamashi', 'Agelo Meti', 'Yaso', 'Belo Jegonfoy'] }
      ]
    },
    {
      name: 'Metekel',
      subcities: [
        { name: 'Metekel Zone', woredas: ['Guba', 'Mandura', 'Bulen', 'Wembera', 'Dibate', 'Pawe'] }
      ]
    }
  ]
};

// Sidama Region (newly established)
const sidama = {
  name: 'Sidama',
  cities: [
    {
      name: 'Hawassa (Sidama Capital)',
      subcities: [
        { name: 'Hawassa City', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06', 'Kebele 07', 'Kebele 08', 'Kebele 09', 'Kebele 10'] },
        { name: 'Hawassa Special Zone', woredas: ['Hawassa Zuria', 'Yirgalem', 'Aleta Wendo', 'Boricha', 'Dale', 'Loka Abaya'] }
      ]
    },
    {
      name: 'Sidama Zones',
      subcities: [
        { name: 'Sidama Zone', woredas: ['Awassa', 'Yirgalem', 'Aleta Wendo', 'Hawassa Zuria', 'Boricha', 'Loka Abaya', 'Dale', 'Chuko', 'Wensho'] },
        { name: 'Sidama Special Zone', woredas: ['Hawassa', 'Wondo Genet', 'Shebedino'] }
      ]
    }
  ]
};

// South West Ethiopia Region
const southwest = {
  name: 'South West Ethiopia',
  cities: [
    {
      name: 'Bonga',
      subcities: [
        { name: 'Bonga Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04'] },
        { name: 'Keffa Zone', woredas: ['Bonga', 'Cheni', 'Gesha', 'Sayilem', 'Keffa'] }
      ]
    },
    {
      name: 'Mizan Teferi',
      subcities: [
        { name: 'Mizan Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04'] },
        { name: 'Bench Sheko Zone', woredas: ['Mizan', 'Dizi', 'Sheko', 'Surma'] }
      ]
    },
    {
      name: 'Tepi',
      subcities: [
        { name: 'Tepi Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03'] },
        { name: 'Sheka Zone', woredas: ['Tepi', 'Masha', 'Anderacha', 'Yeki'] }
      ]
    },
    {
      name: 'Other SWE Zones',
      subcities: [
        { name: 'Dawuro Zone', woredas: ['Tarcha', 'Loma', 'Isara', 'Tocha', 'Mareka'] },
        { name: 'Konta Zone', woredas: ['Konta', 'Kochere', 'Bita Genet'] }
      ]
    }
  ]
};

// Central Ethiopia Region
const centralEthiopia = {
  name: 'Central Ethiopia',
  cities: [
    {
      name: 'Hosaena',
      subcities: [
        { name: 'Hosaena City', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05'] },
        { name: 'Hadiya Zone', woredas: ['Hosaena Zuria', 'Lemo', 'Shashogo', 'Duna', 'Soro', 'Gimbichu'] }
      ]
    },
    {
      name: 'Wolaita Sodo',
      subcities: [
        { name: 'Sodo City', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03', 'Kebele 04', 'Kebele 05', 'Kebele 06'] },
        { name: 'Wolaita Zone', woredas: ['Sodo Zuria', 'Boditi', 'Humbo', 'Kindo Koysha', 'Damot Weyde', 'Bayra Koysha'] }
      ]
    },
    {
      name: 'Durame',
      subcities: [
        { name: 'Durame Town', woredas: ['Kebele 01', 'Kebele 02', 'Kebele 03'] },
        { name: 'Kembata Tembaro Zone', woredas: ['Durame', 'Kacha Bira', 'Tembaro', 'Doyo Gena', 'Mindo', 'Kolito'] }
      ]
    }
  ]
};

// All regions combined
const ethiopiaLocations = {
  regions: [
    addisAbaba,
    oromia,
    amhara,
    tigray,
    snnpr,
    direDawa,
    harari,
    afar,
    somali,
    gambela,
    benishangul,
    sidama,
    southwest,
    centralEthiopia
  ]
};

// Helper functions

/**
 * Get all region names
 */
const getRegionNames = () => {
  return ethiopiaLocations.regions.map(r => r.name);
};

/**
 * Get cities/subcities for a region
 */
const getCitiesForRegion = (regionName) => {
  const region = ethiopiaLocations.regions.find(r => r.name === regionName);
  if (!region) return [];
  
  // For Addis Ababa and Dire Dawa
  if (region.subcities) {
    return region.subcities.map(s => s.name);
  }
  
  // For other regions with cities
  if (region.cities) {
    return region.cities.map(c => c.name);
  }
  
  return [];
};

/**
 * Get subcities for a city (for Addis Ababa and Dire Dawa)
 */
const getSubcitiesForCity = (regionName, cityName) => {
  const region = ethiopiaLocations.regions.find(r => r.name === regionName);
  if (!region) return [];
  
  if (region.subcities) {
    return region.subcities.map(s => s.name);
  }
  
  if (region.cities) {
    const city = region.cities.find(c => c.name === cityName);
    if (city && city.subcities) {
      return city.subcities.map(s => s.name);
    }
  }
  
  return [];
};

/**
 * Get woredas/kebeles for a subcity
 */
const getWoredasForSubcity = (regionName, cityName, subcityName) => {
  const region = ethiopiaLocations.regions.find(r => r.name === regionName);
  if (!region) return [];
  
  let subcity;
  
  if (region.subcities) {
    subcity = region.subcities.find(s => s.name === subcityName);
  } else if (region.cities) {
    const city = region.cities.find(c => c.name === cityName);
    if (city && city.subcities) {
      subcity = city.subcities.find(s => s.name === subcityName);
    }
  }
  
  return subcity ? subcity.woredas : [];
};

/**
 * Get flat list of all cities (for simple dropdown)
 */
const getAllCities = () => {
  const cities = [];
  ethiopiaLocations.regions.forEach(region => {
    if (region.subcities) {
      cities.push(...region.subcities.map(s => ({ region: region.name, city: s.name })));
    } else if (region.cities) {
      cities.push(...region.cities.map(c => ({ region: region.name, city: c.name })));
    }
  });
  return cities;
};

module.exports = {
  ethiopiaLocations,
  getRegionNames,
  getCitiesForRegion,
  getSubcitiesForCity,
  getWoredasForSubcity,
  getAllCities
};
