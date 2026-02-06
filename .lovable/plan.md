
# Plan: Fix Progressive Disclosure - Step 2 alleen tonen na Enter bij woonplaats

## Probleem

Step 2 (Periode selectie) verschijnt zodra de geboortedatum compleet is ingevuld (`isBirthDateComplete`). Dit is incorrect - Step 2 moet pas verschijnen nadat:
1. De geboortedatum compleet is
2. De gebruiker op Enter drukt bij het woonplaatsveld

## Oplossing

### Wijziging in `src/pages/HomeV3.tsx`

**Huidige logica (regel 517):**
```jsx
{isBirthDateComplete && (
  <motion.div>  {/* Step 2 */}
```

**Nieuwe logica:**
Introduceer een nieuwe state `step1Completed` die pas `true` wordt als de gebruiker Enter drukt bij woonplaats. Step 2 wordt dan alleen getoond als `step1Completed` waar is.

### Technische aanpassingen

1. **Nieuwe state toevoegen:**
   ```typescript
   const [step1Completed, setStep1Completed] = useState(false);
   ```

2. **`handleCityKeyDown` aanpassen:**
   ```typescript
   const handleCityKeyDown = (e: React.KeyboardEvent) => {
     if (e.key === 'Enter' && isBirthDateComplete) {
       e.preventDefault();
       setStep1Completed(true);  // <-- markeer step 1 als voltooid
       setStep1ManualAdvance(true);
     }
   };
   ```

3. **Visibility van Step 2 en Step 3 aanpassen:**
   - Step 2: `{step1Completed && (` i.p.v. `{isBirthDateComplete && (`
   - Step 3: blijft `{isStep2Complete && (` (dit is al correct)

4. **Update `isStep1Complete` en `completedSteps`:**
   - `isStep1Complete` moet `step1Completed` gebruiken voor de visuele indicator

### Resultaat

| Actie | Huidige gedrag | Nieuw gedrag |
|-------|---------------|--------------|
| Jaar ingevuld | Step 2 verschijnt | Focus springt naar woonplaats |
| Woonplaats + Enter | Geen effect op visibility | Step 2 verschijnt |
| Klik periode | Step 3 verschijnt | Step 3 verschijnt (ongewijzigd) |
