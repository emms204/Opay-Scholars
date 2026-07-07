import pandas as pd
import re

PATH = '/home/emms/Downloads/Opay/OPay Scholars Innovation Application Form (Responses).xlsx'

# --- 24 partner schools (per the report series / form dropdown) ---
PARTNERS = [
    'Ahmadu Bello University',
    'Alex Ekwueme Federal University Ndufu Alike (AE-FUNAI), Ebonyi',
    'Ambrose Alli University',
    'Bayero University Kano',
    'Benue State Polytechnic, Ugbokolo',
    'Benue State University (MOAU Makurdi)',
    'Federal Polytechnic Nekede',
    'Federal University of Health Sciences Azare',
    'Federal University of Technology, Minna',
    'Kogi State Polytechnic',
    'Kwara State University',
    'Lagos State University',
    'Montgomery Polytechnic, Ikere-Ekiti',
    'Nasarawa State University',
    'Obafemi Awolowo University',
    'Olabisi Onabanjo University',
    'University of Abuja',
    'University of Calabar',
    'University of Ibadan',
    'University of Ilorin',
    'University of Jos',
    'University of Maiduguri',
    'University of Nigeria, Nsukka',
    'University of Uyo',
]

INVALID = {
    'nan', 'none', 'nil', 'n/a', 'na', 'v', '',
    'coursera', 'marking and business', 'opay digital services',
    'sahara computer academy & cafe', 'gdss pkm',
    'community secondary school, izzio', 'nature academy',
    'awaiting university admission. abraka university delta state',
    'leave blank (unless yobe state university is not listed).',
    'nexus-fedpodam',
    'i appreciate opay for creating a platform that encourages innovation among youths. this challenge can help many talented students showcase their ideas, gain experience, and contribute to the development of technology in africa.',
}

def canon(raw):
    """Return (canonical_name, kind) where kind in {'partner','nonpartner','invalid','multi'}"""
    if raw is None:
        return (None, 'invalid')
    s = str(raw).strip()
    low = s.lower().strip(' .')
    if low in INVALID or low == 'nan':
        return (None, 'invalid')
    # multi-school entry
    if low.count(',') >= 2 and re.search(r'(university|futa|unilag).*(university|futa|unilag)', low):
        if 'covenant university, futa' in low:
            return (None, 'multi')

    # ---- partner matching ----
    def has(*kw):
        return all(k in low for k in kw)

    if has('ahmadu bello'): return ('Ahmadu Bello University', 'partner')
    if has('bayero') or low == 'buk': return ('Bayero University Kano', 'partner')
    if 'kano university of science and technology' in low: return ('Kano Univ. of Sci. & Tech., Wudil', 'nonpartner')
    if has('benue', 'polytechnic') or has('benue state poly'): return ('Benue State Polytechnic, Ugbokolo', 'partner')
    if 'federal polytechnic nekede' in low: return ('Federal Polytechnic Nekede', 'partner')
    if has('health sciences', 'azare'): return ('Federal University of Health Sciences Azare', 'partner')
    if has('technology', 'minna') or 'futminna' in low: return ('Federal University of Technology, Minna', 'partner')
    if 'kogi state polytechnic' in low: return ('Kogi State Polytechnic', 'partner')
    if has('kwara', 'university'): return ('Kwara State University', 'partner')
    if 'lagos state university of science' in low or 'lasustech' in low:
        return ('Lagos State University of Science & Technology', 'nonpartner')
    if has('lagos state university'): return ('Lagos State University', 'partner')
    if 'montgomery' in low: return ('Montgomery Polytechnic, Ikere-Ekiti', 'partner')
    if has('nasarawa', 'state university'): return ('Nasarawa State University', 'partner')
    if has('obafemi') or low == 'oau': return ('Obafemi Awolowo University', 'partner')
    if has('olabisi'): return ('Olabisi Onabanjo University', 'partner')
    if has('university of abuja'): return ('University of Abuja', 'partner')
    if has('university of calabar') or 'unical' in low: return ('University of Calabar', 'partner')
    if has('university of ibadan'): return ('University of Ibadan', 'partner')
    if has('university of ilorin') or 'unilorin' in low: return ('University of Ilorin', 'partner')
    if has('university of jos') or low == 'unijos': return ('University of Jos', 'partner')
    if has('university of maiduguri') or 'unimaid' in low: return ('University of Maiduguri', 'partner')
    if has('nigeria', 'nsukka') or low == 'unn': return ('University of Nigeria, Nsukka', 'partner')
    if has('university of uyo') or 'uniuyo' in low: return ('University of Uyo', 'partner')
    if 'ambrose alli' in low: return ('Ambrose Alli University', 'partner')
    if 'alex ekwueme' in low or 'funai' in low: return ('Alex Ekwueme FU Ndufu Alike (AE-FUNAI)', 'partner')
    if has('benue', 'university') and 'polytechnic' not in low: return ('Benue State University (MOAU Makurdi)', 'partner')

    # ---- non-partner canonicalization (group obvious variants) ----
    if 'university of lagos' in low or low in ('unilag', 'unilag akoka') or low.startswith('unilag'):
        return ('University of Lagos', 'nonpartner')
    if 'university of benin' in low or low == 'uniben': return ('University of Benin', 'nonpartner')
    if 'agriculture' in low and 'abeokuta' in low or low == 'funaab':
        return ('Federal University of Agriculture, Abeokuta', 'nonpartner')
    if 'dutsin' in low and 'ma' in low: return ('Federal University Dutsin-Ma', 'nonpartner')
    if 'technology' in low and 'owerri' in low: return ('Federal University of Technology, Owerri', 'nonpartner')
    if 'technology' in low and 'akure' in low: return ('Federal University of Technology, Akure', 'nonpartner')
    if 'nnamdi az' in low: return ('Nnamdi Azikiwe University, Awka', 'nonpartner')
    if 'national open university' in low or low == 'noun': return ('National Open University of Nigeria', 'nonpartner')
    if 'sokoto state university' in low: return ('Sokoto State University', 'nonpartner')
    if 'taraba state university' in low: return ('Taraba State University, Jalingo', 'nonpartner')
    if "umaru musa yar" in low: return ("Umaru Musa Yar'adua University, Katsina", 'nonpartner')
    if 'yobe state university' in low: return ('Yobe State University', 'nonpartner')
    if 'federal polytechnic nasarawa' in low or 'federal polytechnic nassarawa' in low or 'fedponasarawa' in low:
        return ('Federal Polytechnic Nasarawa', 'nonpartner')
    if 'heritage polytechnic' in low: return ('Heritage Polytechnic', 'nonpartner')
    if 'miva' in low: return ('Miva Open University', 'nonpartner')
    if 'waziri umaru' in low: return ('Waziri Umaru Federal Polytechnic, Birnin Kebbi', 'nonpartner')
    if 'kwara state polytechnic' in low: return ('Kwara State Polytechnic, Ilorin', 'nonpartner')

    # otherwise: a distinct non-partner institution, keep cleaned title
    return (s, 'nonpartner')


def main():
    df = pd.read_excel(PATH, sheet_name='Form Responses 1')
    df['Timestamp'] = pd.to_datetime(df['Timestamp'], errors='coerce')
    start, end = pd.Timestamp('2026-06-23').date(), pd.Timestamp('2026-06-29').date()
    w5 = df[(df['Timestamp'].dt.date >= start) & (df['Timestamp'].dt.date <= end)].copy()

    inst = w5['Name of Institution'].astype(str).str.strip()
    other = w5['If Other, please specify'].astype(str).str.strip()
    combined = inst.where(~inst.str.contains('Other', case=False, na=False), other)
    res = combined.apply(canon)
    w5['canon'] = [r[0] for r in res]
    w5['kind'] = [r[1] for r in res]

    n = len(w5)
    print('========== WEEK 5 (23-29 Jun 2026) ==========')
    print('Total team applications:', n)
    print('Individual students (teams x5 est.):', n*5)

    # daily trend
    print('\n--- Daily trend ---')
    daily = w5['Timestamp'].dt.strftime('%a %d %b').value_counts()
    daily = w5.groupby(w5['Timestamp'].dt.date).size()
    for d, c in daily.items():
        print(pd.Timestamp(d).strftime('%a %d %b'), '->', c)

    # partner vs non-partner
    kc = w5['kind'].value_counts()
    print('\n--- Kind breakdown ---')
    print(kc.to_string())
    partner_n = (w5['kind']=='partner').sum()
    nonpartner_n = (w5['kind']=='nonpartner').sum()
    invalid_n = (w5['kind']=='invalid').sum()
    multi_n = (w5['kind']=='multi').sum()
    print(f'Partner: {partner_n} ({partner_n/n*100:.0f}%)')
    print(f'Non-partner: {nonpartner_n} ({nonpartner_n/n*100:.0f}%)')
    print(f'Invalid/multi: {invalid_n+multi_n}')

    # institutions reached (distinct valid institutions: partner + nonpartner canon)
    valid = w5[w5['kind'].isin(['partner','nonpartner'])]
    print('\nInstitutions reached (distinct partner+nonpartner):', valid['canon'].nunique())

    # partner school table
    print('\n--- Signups by partner school ---')
    pt = w5[w5['kind']=='partner']['canon'].value_counts()
    print(pt.to_string())
    print('Active partner schools:', pt.shape[0], '/24')
    inactive = [p for p in PARTNERS if p not in set(pt.index)]
    print('Inactive partner schools:', len(inactive))
    for p in inactive: print('   -', p)

    # non-partner breakdown
    print('\n--- Non-partner breakdown ---')
    npt = w5[w5['kind']=='nonpartner']['canon'].value_counts()
    two_plus = npt[npt>=2]
    singles = npt[npt==1]
    print(f'Schools with 2+ apps: {two_plus.shape[0]} schools, {two_plus.sum()} apps')
    print(two_plus.to_string())
    print(f'Schools with single app: {singles.shape[0]} schools, {singles.sum()} apps')
    print(f'Multi-school & invalid entries: {invalid_n+multi_n} apps')
    print(f'TOTAL non-partner institutions: {npt.shape[0]}')

    # innovation categories (now multi-select -> count mentions)
    print('\n--- Innovation categories (mentions, multi-select) ---')
    from collections import Counter
    cnt = Counter()
    single_only = Counter()
    for v in w5['Innovation Category'].dropna().astype(str):
        parts = [p.strip() for p in v.split(',') if p.strip()]
        # collapse the "Other (please specify)" label
        parts = ['Other / Multiple' if p.startswith('Other') else p for p in parts]
        for p in parts:
            cnt[p] += 1
        if len(parts) == 1:
            single_only[parts[0]] += 1
    total_mentions = sum(cnt.values())
    for k, c in cnt.most_common():
        print(f'{k}: {c} mentions ({c/n*100:.0f}% of teams)')
    print('Total mentions:', total_mentions, '| rows with single category:', sum(single_only.values()))

if __name__ == '__main__':
    main()
