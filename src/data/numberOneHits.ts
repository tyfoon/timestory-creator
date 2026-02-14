/**
 * Multiple iconic hit singles per year (US/UK Billboard).
 * More entries per year = more album covers in the sidebar.
 */
export interface NumberOneHit {
  artist: string;
  title: string;
}

export const numberOneHits: Record<number, NumberOneHit[]> = {
  1960: [
    { artist: "Percy Faith", title: "Theme from A Summer Place" },
    { artist: "Elvis Presley", title: "It's Now or Never" },
    { artist: "The Drifters", title: "Save the Last Dance for Me" },
  ],
  1961: [
    { artist: "Bobby Lewis", title: "Tossin' and Turnin'" },
    { artist: "Del Shannon", title: "Runaway" },
    { artist: "Dion", title: "Runaround Sue" },
  ],
  1962: [
    { artist: "Bobby Vinton", title: "Roses Are Red" },
    { artist: "Ray Charles", title: "I Can't Stop Loving You" },
    { artist: "The Four Seasons", title: "Sherry" },
  ],
  1963: [
    { artist: "Jimmy Gilmer and the Fireballs", title: "Sugar Shack" },
    { artist: "The Chiffons", title: "He's So Fine" },
    { artist: "Stevie Wonder", title: "Fingertips" },
  ],
  1964: [
    { artist: "The Beatles", title: "I Want to Hold Your Hand" },
    { artist: "The Beatles", title: "A Hard Day's Night" },
    { artist: "Roy Orbison", title: "Oh, Pretty Woman" },
  ],
  1965: [
    { artist: "The Rolling Stones", title: "Satisfaction" },
    { artist: "The Righteous Brothers", title: "You've Lost That Lovin' Feelin'" },
    { artist: "The Byrds", title: "Turn! Turn! Turn!" },
  ],
  1966: [
    { artist: "The Monkees", title: "I'm a Believer" },
    { artist: "The Beach Boys", title: "Good Vibrations" },
    { artist: "Frank Sinatra", title: "Strangers in the Night" },
  ],
  1967: [
    { artist: "Lulu", title: "To Sir with Love" },
    { artist: "The Beatles", title: "All You Need Is Love" },
    { artist: "Aretha Franklin", title: "Respect" },
  ],
  1968: [
    { artist: "The Beatles", title: "Hey Jude" },
    { artist: "Otis Redding", title: "Sittin' On The Dock of the Bay" },
    { artist: "Marvin Gaye", title: "I Heard It Through the Grapevine" },
  ],
  1969: [
    { artist: "The Archies", title: "Sugar, Sugar" },
    { artist: "The Rolling Stones", title: "Honky Tonk Women" },
    { artist: "The 5th Dimension", title: "Aquarius/Let the Sunshine In" },
  ],
  1970: [
    { artist: "Simon & Garfunkel", title: "Bridge over Troubled Water" },
    { artist: "The Jackson 5", title: "ABC" },
    { artist: "Edwin Starr", title: "War" },
  ],
  1971: [
    { artist: "Three Dog Night", title: "Joy to the World" },
    { artist: "Rod Stewart", title: "Maggie May" },
    { artist: "Carole King", title: "It's Too Late" },
  ],
  1972: [
    { artist: "Don McLean", title: "American Pie" },
    { artist: "Gilbert O'Sullivan", title: "Alone Again (Naturally)" },
    { artist: "Al Green", title: "Let's Stay Together" },
  ],
  1973: [
    { artist: "Roberta Flack", title: "Killing Me Softly with His Song" },
    { artist: "Stevie Wonder", title: "Superstition" },
    { artist: "Marvin Gaye", title: "Let's Get It On" },
  ],
  1974: [
    { artist: "Barbra Streisand", title: "The Way We Were" },
    { artist: "John Denver", title: "Sunshine on My Shoulders" },
    { artist: "Carl Douglas", title: "Kung Fu Fighting" },
  ],
  1975: [
    { artist: "Captain & Tennille", title: "Love Will Keep Us Together" },
    { artist: "Queen", title: "Bohemian Rhapsody" },
    { artist: "Elton John", title: "Philadelphia Freedom" },
  ],
  1976: [
    { artist: "Johnnie Taylor", title: "Disco Lady" },
    { artist: "ABBA", title: "Dancing Queen" },
    { artist: "Elton John & Kiki Dee", title: "Don't Go Breaking My Heart" },
  ],
  1977: [
    { artist: "Bee Gees", title: "Stayin' Alive" },
    { artist: "Fleetwood Mac", title: "Dreams" },
    { artist: "Eagles", title: "Hotel California" },
  ],
  1978: [
    { artist: "Bee Gees", title: "Night Fever" },
    { artist: "John Travolta & Olivia Newton-John", title: "You're the One That I Want" },
    { artist: "Andy Gibb", title: "Shadow Dancing" },
  ],
  1979: [
    { artist: "Knack", title: "My Sharona" },
    { artist: "Donna Summer", title: "Hot Stuff" },
    { artist: "Gloria Gaynor", title: "I Will Survive" },
  ],
  1980: [
    { artist: "Blondie", title: "Call Me" },
    { artist: "Pink Floyd", title: "Another Brick in the Wall" },
    { artist: "Queen", title: "Crazy Little Thing Called Love" },
  ],
  1981: [
    { artist: "Kim Carnes", title: "Bette Davis Eyes" },
    { artist: "Soft Cell", title: "Tainted Love" },
    { artist: "Phil Collins", title: "In the Air Tonight" },
  ],
  1982: [
    { artist: "Survivor", title: "Eye of the Tiger" },
    { artist: "Dexys Midnight Runners", title: "Come On Eileen" },
    { artist: "Culture Club", title: "Do You Really Want to Hurt Me" },
  ],
  1983: [
    { artist: "The Police", title: "Every Breath You Take" },
    { artist: "Michael Jackson", title: "Billie Jean" },
    { artist: "Eurythmics", title: "Sweet Dreams" },
  ],
  1984: [
    { artist: "Prince", title: "When Doves Cry" },
    { artist: "Cyndi Lauper", title: "Girls Just Want to Have Fun" },
    { artist: "Frankie Goes to Hollywood", title: "Relax" },
  ],
  1985: [
    { artist: "Wham!", title: "Careless Whisper" },
    { artist: "a-ha", title: "Take On Me" },
    { artist: "Dire Straits", title: "Money for Nothing" },
  ],
  1986: [
    { artist: "Berlin", title: "Take My Breath Away" },
    { artist: "Peter Gabriel", title: "Sledgehammer" },
    { artist: "Madonna", title: "Papa Don't Preach" },
  ],
  1987: [
    { artist: "George Michael", title: "Faith" },
    { artist: "Michael Jackson", title: "Bad" },
    { artist: "U2", title: "With or Without You" },
  ],
  1988: [
    { artist: "George Michael", title: "One More Try" },
    { artist: "INXS", title: "Need You Tonight" },
    { artist: "Bobby McFerrin", title: "Don't Worry, Be Happy" },
  ],
  1989: [
    { artist: "Bobby Brown", title: "My Prerogative" },
    { artist: "The Bangles", title: "Eternal Flame" },
    { artist: "New Kids on the Block", title: "Hangin' Tough" },
  ],
  1990: [
    { artist: "Sinéad O'Connor", title: "Nothing Compares 2 U" },
    { artist: "MC Hammer", title: "U Can't Touch This" },
    { artist: "Roxette", title: "It Must Have Been Love" },
  ],
  1991: [
    { artist: "Bryan Adams", title: "(Everything I Do) I Do It for You" },
    { artist: "Nirvana", title: "Smells Like Teen Spirit" },
    { artist: "R.E.M.", title: "Losing My Religion" },
  ],
  1992: [
    { artist: "Whitney Houston", title: "I Will Always Love You" },
    { artist: "Sir Mix-a-Lot", title: "Baby Got Back" },
    { artist: "Kris Kross", title: "Jump" },
  ],
  1993: [
    { artist: "Tag Team", title: "Whoomp! (There It Is)" },
    { artist: "UB40", title: "Can't Help Falling in Love" },
    { artist: "Meat Loaf", title: "I'd Do Anything for Love" },
  ],
  1994: [
    { artist: "Boyz II Men", title: "I'll Make Love to You" },
    { artist: "Wet Wet Wet", title: "Love Is All Around" },
    { artist: "Lisa Loeb", title: "Stay (I Missed You)" },
  ],
  1995: [
    { artist: "Coolio", title: "Gangsta's Paradise" },
    { artist: "TLC", title: "Waterfalls" },
    { artist: "Seal", title: "Kiss from a Rose" },
  ],
  1996: [
    { artist: "Los Del Rio", title: "Macarena" },
    { artist: "Spice Girls", title: "Wannabe" },
    { artist: "Fugees", title: "Killing Me Softly" },
  ],
  1997: [
    { artist: "Elton John", title: "Candle in the Wind 1997" },
    { artist: "Hanson", title: "MMMBop" },
    { artist: "Aqua", title: "Barbie Girl" },
  ],
  1998: [
    { artist: "Brandy & Monica", title: "The Boy Is Mine" },
    { artist: "Cher", title: "Believe" },
    { artist: "Natalie Imbruglia", title: "Torn" },
  ],
  1999: [
    { artist: "Cher", title: "Believe" },
    { artist: "TLC", title: "No Scrubs" },
    { artist: "Ricky Martin", title: "Livin' La Vida Loca" },
  ],
  2000: [
    { artist: "Faith Hill", title: "Breathe" },
    { artist: "Santana", title: "Smooth" },
    { artist: "Destiny's Child", title: "Say My Name" },
  ],
  2001: [
    { artist: "Lifehouse", title: "Hanging by a Moment" },
    { artist: "Crazy Town", title: "Butterfly" },
    { artist: "Alicia Keys", title: "Fallin'" },
  ],
  2002: [
    { artist: "Eminem", title: "Lose Yourself" },
    { artist: "Nelly", title: "Hot in Herre" },
    { artist: "Avril Lavigne", title: "Complicated" },
  ],
  2003: [
    { artist: "Beyoncé", title: "Crazy in Love" },
    { artist: "OutKast", title: "Hey Ya!" },
    { artist: "50 Cent", title: "In da Club" },
  ],
  2004: [
    { artist: "Usher", title: "Yeah!" },
    { artist: "OutKast", title: "Hey Ya!" },
    { artist: "Hoobastank", title: "The Reason" },
  ],
  2005: [
    { artist: "Mariah Carey", title: "We Belong Together" },
    { artist: "Gwen Stefani", title: "Hollaback Girl" },
    { artist: "Green Day", title: "Boulevard of Broken Dreams" },
  ],
  2006: [
    { artist: "Daniel Powter", title: "Bad Day" },
    { artist: "Gnarls Barkley", title: "Crazy" },
    { artist: "Shakira", title: "Hips Don't Lie" },
  ],
  2007: [
    { artist: "Rihanna", title: "Umbrella" },
    { artist: "Beyoncé", title: "Irreplaceable" },
    { artist: "Plain White T's", title: "Hey There Delilah" },
  ],
  2008: [
    { artist: "Flo Rida", title: "Low" },
    { artist: "Leona Lewis", title: "Bleeding Love" },
    { artist: "Katy Perry", title: "I Kissed a Girl" },
  ],
  2009: [
    { artist: "Black Eyed Peas", title: "Boom Boom Pow" },
    { artist: "Lady Gaga", title: "Poker Face" },
    { artist: "Kings of Leon", title: "Use Somebody" },
  ],
  2010: [
    { artist: "Ke$ha", title: "TiK ToK" },
    { artist: "Eminem", title: "Love the Way You Lie" },
    { artist: "Cee Lo Green", title: "Forget You" },
  ],
  2011: [
    { artist: "Adele", title: "Rolling in the Deep" },
    { artist: "Adele", title: "Someone Like You" },
    { artist: "LMFAO", title: "Party Rock Anthem" },
  ],
  2012: [
    { artist: "Gotye", title: "Somebody That I Used to Know" },
    { artist: "Carly Rae Jepsen", title: "Call Me Maybe" },
    { artist: "PSY", title: "Gangnam Style" },
  ],
  2013: [
    { artist: "Robin Thicke", title: "Blurred Lines" },
    { artist: "Daft Punk", title: "Get Lucky" },
    { artist: "Lorde", title: "Royals" },
  ],
  2014: [
    { artist: "Pharrell Williams", title: "Happy" },
    { artist: "John Legend", title: "All of Me" },
    { artist: "Meghan Trainor", title: "All About That Bass" },
  ],
  2015: [
    { artist: "Mark Ronson", title: "Uptown Funk" },
    { artist: "Adele", title: "Hello" },
    { artist: "Wiz Khalifa", title: "See You Again" },
  ],
  2016: [
    { artist: "Justin Bieber", title: "Love Yourself" },
    { artist: "Drake", title: "One Dance" },
    { artist: "The Chainsmokers", title: "Closer" },
  ],
  2017: [
    { artist: "Luis Fonsi", title: "Despacito" },
    { artist: "Ed Sheeran", title: "Shape of You" },
    { artist: "Bruno Mars", title: "That's What I Like" },
  ],
  2018: [
    { artist: "Drake", title: "God's Plan" },
    { artist: "Childish Gambino", title: "This Is America" },
    { artist: "Juice WRLD", title: "Lucid Dreams" },
  ],
  2019: [
    { artist: "Lil Nas X", title: "Old Town Road" },
    { artist: "Billie Eilish", title: "Bad Guy" },
    { artist: "Lewis Capaldi", title: "Someone You Loved" },
  ],
  2020: [
    { artist: "The Weeknd", title: "Blinding Lights" },
    { artist: "Dua Lipa", title: "Don't Start Now" },
    { artist: "Roddy Ricch", title: "The Box" },
  ],
  2021: [
    { artist: "Olivia Rodrigo", title: "drivers license" },
    { artist: "Olivia Rodrigo", title: "good 4 u" },
    { artist: "Lil Nas X", title: "Montero (Call Me By Your Name)" },
  ],
  2022: [
    { artist: "Harry Styles", title: "As It Was" },
    { artist: "Kate Bush", title: "Running Up That Hill" },
    { artist: "Lizzo", title: "About Damn Time" },
  ],
  2023: [
    { artist: "Miley Cyrus", title: "Flowers" },
    { artist: "SZA", title: "Kill Bill" },
    { artist: "Doja Cat", title: "Paint The Town Red" },
  ],
  2024: [
    { artist: "Sabrina Carpenter", title: "Espresso" },
    { artist: "Benson Boone", title: "Beautiful Things" },
    { artist: "Chappell Roan", title: "Good Luck, Babe!" },
  ],
  2025: [
    { artist: "Lady Gaga", title: "Die With a Smile" },
    { artist: "Kendrick Lamar", title: "Not Like Us" },
    { artist: "Rosé & Bruno Mars", title: "APT." },
  ],
};
