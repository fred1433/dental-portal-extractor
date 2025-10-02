# Profile Summary

## Table `root`
- Rows observed (for inference): 15

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `portal` | 15 | 0 | str:15 |  | 14 |
| `extractiondate` | 15 | 0 | timestamptz:15 |  |  |

**Domain candidates:**
- `portal`: distinct≈1 coverage=100% — top: `DeltaDentalINS` (15)
- `extractiondate`: distinct≈15 coverage=100% — top: `2025-09-21T23:55:29.000Z` (1), `2025-09-21T21:19:33.212Z` (1), `2025-09-21T23:58:55.188Z` (1), `2025-09-21T23:58:32.629Z` (1), `2025-09-21T23:58:47.701Z` (1), `2025-09-21T21:19:10.804Z` (1), `2025-09-21T20:28:45.088Z` (1), `2025-09-21T23:58:25.734Z` (1), `2025-09-21T21:19:03.524Z` (1), `2025-09-21T20:28:37.962Z` (1)

## Table `root__patient`
- Rows observed (for inference): 15
- Parent: `root`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `subscriberid` | 15 | 0 | str:15 |  | 12 |
| `firstname` | 15 | 0 | str:15 |  | 9 |
| `lastname` | 15 | 0 | str:15 |  | 8 |
| `dateofbirth` | 15 | 0 | date:15 |  |  |

**Domain candidates:**
- `subscriberid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)
- `firstname`: distinct≈15 coverage=100% — top: `ALEXANDER` (1), `AVA` (1), `CECILIA` (1), `DAROD` (1), `DEAN` (1), `DECLAN` (1), `EMILY` (1), `ESTELLE` (1), `ISABELLA` (1), `JANIECE` (1)
- `lastname`: distinct≈14 coverage=100% — top: `GARCIA` (2), `LUKE` (1), `EMERSON` (1), `HARRIS` (1), `SMITH` (1), `BARNES` (1), `SCOTT` (1), `MAZET` (1), `ANDERSON` (1), `DALTON` (1)
- `dateofbirth`: distinct≈15 coverage=100% — top: `09/06/2008` (1), `06/07/2019` (1), `02/05/2019` (1), `01/19/2024` (1), `07/16/2015` (1), `01/26/2014` (1), `06/05/2013` (1), `10/19/2011` (1), `12/15/2017` (1), `09/18/2018` (1)

## Table `root__eligibility`
- Rows observed (for inference): 15
- Parent: `root`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `wait` | 0 | 13 | null:13 |  |  |
| `hist` | 0 | 1 | null:1 |  |  |

## Table `root__claims`
- Rows observed (for inference): 55
- Parent: `root`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 55 | 0 | int:55 | 0|12 |  |
| `claimid` | 55 | 0 | str:55 |  | 15 |
| `dateofserviceenddate` | 55 | 0 | date:55 |  |  |
| `dateofservicestartdate` | 55 | 0 | date:55 |  |  |
| `processeddate` | 55 | 0 | date:55 |  |  |
| `receiveddate` | 55 | 0 | date:55 |  |  |
| `statuscode` | 55 | 0 | str:55 |  | 1 |
| `statuscodedescription` | 55 | 0 | str:55 |  | 9 |
| `statusdate` | 55 | 0 | date:55 |  |  |
| `type` | 55 | 0 | str:55 |  | 5 |

**Domain candidates:**
- `ordinal`: distinct≈13 coverage=100% — top: `0` (12), `1` (11), `2` (3), `3` (3), `4` (3), `5` (3), `6` (3), `7` (3), `8` (3), `9` (3)
- `dateofserviceenddate`: distinct≈48 coverage=49% — top: `08/07/2025` (3), `08/14/2025` (3), `02/13/2025` (3), `09/09/2025` (2), `09/16/2025` (1), `07/22/2025` (1), `08/28/2025` (1), `02/20/2025` (1), `07/30/2025` (1), `06/30/2025` (1)
- `dateofservicestartdate`: distinct≈48 coverage=49% — top: `08/07/2025` (3), `08/14/2025` (3), `02/13/2025` (3), `09/09/2025` (2), `09/16/2025` (1), `07/22/2025` (1), `08/28/2025` (1), `02/20/2025` (1), `07/30/2025` (1), `06/30/2025` (1)
- `processeddate`: distinct≈36 coverage=70% — top: `08/27/2025` (10), `02/13/2025` (3), `09/10/2025` (3), `08/26/2025` (2), `08/05/2025` (2), `07/09/2025` (2), `06/11/2025` (2), `04/09/2025` (2), `04/02/2025` (2), `09/16/2025` (1)
- `receiveddate`: distinct≈36 coverage=70% — top: `08/27/2025` (10), `02/13/2025` (3), `09/10/2025` (3), `08/25/2025` (2), `08/05/2025` (2), `07/09/2025` (2), `06/11/2025` (2), `04/09/2025` (2), `04/02/2025` (2), `09/16/2025` (1)
- `statuscode`: distinct≈2 coverage=100% — top: `Y` (54), `D` (1)
- `statuscodedescription`: distinct≈2 coverage=100% — top: `Processed` (54), `Denied` (1)
- `statusdate`: distinct≈27 coverage=87% — top: `08/31/2025` (13), `08/10/2025` (4), `09/14/2025` (4), `08/24/2025` (3), `02/16/2025` (3), `08/17/2025` (2), `07/13/2025` (2), `06/13/2025` (2), `04/13/2025` (2), `10/13/2024` (2)
- `type`: distinct≈1 coverage=100% — top: `Claim` (55)

## Table `root__summary`
- Rows observed (for inference): 15
- Parent: `root`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `patientname` | 15 | 0 | str:15 |  | 16 |
| `memberid` | 15 | 0 | str:15 |  | 12 |
| `totalclaims` | 15 | 0 | int:15 | 0|13 |  |

**Domain candidates:**
- `patientname`: distinct≈15 coverage=100% — top: `ALEXANDER LUKE` (1), `AVA EMERSON` (1), `CECILIA GARCIA` (1), `DAROD HARRIS` (1), `DEAN SMITH` (1), `DECLAN BARNES` (1), `EMILY SCOTT` (1), `ESTELLE MAZET` (1), `ISABELLA GARCIA` (1), `JANIECE ANDERSON` (1)
- `memberid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)
- `totalclaims`: distinct≈5 coverage=100% — top: `2` (8), `0` (3), `13` (2), `1` (1), `12` (1)

## Table `root__eligibility__pkg`
- Rows observed (for inference): 15
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `benefitpackageid` | 15 | 0 | str:15 |  | 8 |
| `cpppackage` | 15 | 0 | bool:15 |  |  |
| `healthspringpackage` | 15 | 0 | bool:15 |  |  |
| `hometownpackage` | 15 | 0 | bool:15 |  |  |
| `peopleshealthpackage` | 15 | 0 | bool:15 |  |  |
| `deltacarepackage` | 15 | 0 | bool:15 |  |  |
| `incentivepackage` | 15 | 0 | bool:15 |  |  |
| `accnetwork` | 15 | 0 | bool:15 |  |  |
| `missingtoothindicator` | 15 | 0 | bool:15 |  |  |

**Domain candidates:**
- `benefitpackageid`: distinct≈14 coverage=100% — top: `PDN10695` (2), `PDN07520` (1), `PEG08751` (1), `PDN08878` (1), `PCN11030` (1), `P0096384` (1), `PCN10137` (1), `PDN09013` (1), `P0097676` (1), `P0019355` (1)
- `cpppackage`: distinct≈1 coverage=100% — top: `False` (15)
- `healthspringpackage`: distinct≈1 coverage=100% — top: `False` (15)
- `hometownpackage`: distinct≈1 coverage=100% — top: `False` (15)
- `peopleshealthpackage`: distinct≈1 coverage=100% — top: `False` (15)
- `deltacarepackage`: distinct≈1 coverage=100% — top: `False` (15)
- `incentivepackage`: distinct≈1 coverage=100% — top: `False` (15)
- `accnetwork`: distinct≈2 coverage=100% — top: `False` (14), `True` (1)
- `missingtoothindicator`: distinct≈2 coverage=100% — top: `False` (14), `True` (1)

## Table `root__eligibility__maxded`
- Rows observed (for inference): 15
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__eligibility__addl`
- Rows observed (for inference): 15
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `groupnumber` | 15 | 0 | str:15 |  | 5 |
| `divisionnumber` | 15 | 0 | str:15 |  | 5 |
| `benefitpackageid` | 15 | 0 | str:15 |  | 8 |

**Domain candidates:**
- `groupnumber`: distinct≈14 coverage=100% — top: `23123` (2), `03784` (1), `17870` (1), `20132` (1), `04170` (1), `15975` (1), `05968` (1), `03199` (1), `18821` (1), `12316` (1)
- `divisionnumber`: distinct≈11 coverage=100% — top: `00001` (5), `01006` (1), `00002` (1), `11000` (1), `00201` (1), `20001` (1), `00007` (1), `01563` (1), `10091` (1), `01001` (1)
- `benefitpackageid`: distinct≈14 coverage=100% — top: `PDN10695` (2), `PDN07520` (1), `PEG08751` (1), `PDN08878` (1), `PCN11030` (1), `P0096384` (1), `PCN10137` (1), `PDN09013` (1), `P0097676` (1), `P0019355` (1)

## Table `root__eligibility__hist`
- Rows observed (for inference): 14
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `personid` | 14 | 0 | str:14 |  | 16 |

**Domain candidates:**
- `personid`: distinct≈14 coverage=100% — top: `0227112413070852` (1), `0357971512224895` (1), `0279020412412638` (1), `0474520312240237` (1), `0890990112222698` (1), `0523210814452330` (1), `0470212513115331` (1), `0676010209113380` (1), `0390420412412656` (1), `0894382519294903` (1)

## Table `root__eligibility__mails`
- Rows observed (for inference): 15
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__eligibility__persons`
- Rows observed (for inference): 15
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__claims__patient`
- Rows observed (for inference): 55
- Parent: `root__claims`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `id` | 55 | 0 | str:55 |  | 12 |
| `firstname` | 55 | 0 | str:55 |  | 9 |
| `lastname` | 55 | 0 | str:55 |  | 8 |
| `birthdate` | 55 | 0 | date:55 |  |  |
| `relationship` | 53 | 0 | str:53 |  | 5 |
| `personid` | 55 | 0 | str:55 |  | 16 |

**Domain candidates:**
- `id`: distinct≈12 coverage=100% — top: `116668264902` (13), `002175461802` (13), `114665471803` (12), `122766742002` (2), `125385078603` (2), `123070391605` (2), `113681051403` (2), `125385078605` (2), `122598804402` (2), `113966601504` (2)
- `firstname`: distinct≈12 coverage=100% — top: `Dean` (13), `Estelle` (13), `Emily` (12), `Alexander` (2), `Cecilia` (2), `Darod` (2), `Declan` (2), `Isabella` (2), `Janiece` (2), `Kennedy` (2)
- `lastname`: distinct≈11 coverage=100% — top: `Smith` (13), `Mazet` (13), `Scott` (12), `Garcia` (4), `Luke` (2), `Harris` (2), `Barnes` (2), `Anderson` (2), `Dalton` (2), `Willis` (2)
- `birthdate`: distinct≈12 coverage=100% — top: `07/16/2015` (13), `10/19/2011` (13), `06/05/2013` (12), `09/06/2008` (2), `02/05/2019` (2), `01/19/2024` (2), `01/26/2014` (2), `12/15/2017` (2), `09/18/2018` (2), `10/07/2023` (2)
- `relationship`: distinct≈1 coverage=100% — top: `Child` (53)
- `personid`: distinct≈12 coverage=100% — top: `0890990112222698` (13), `0676010209113380` (13), `0470212513115331` (12), `0227112413070852` (2), `0279020412412638` (2), `0474520312240237` (2), `0523210814452330` (2), `0390420412412656` (2), `0894382519294903` (2), `0462421916452138` (2)

## Table `root__claims__paymentsummary`
- Rows observed (for inference): 55
- Parent: `root__claims`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `totalchargedamount` | 55 | 0 | str:55 |  | 7 |
| `totalapprovedamount` | 55 | 0 | str:55 |  | 7 |
| `totalallowedamount` | 55 | 0 | str:55 |  | 7 |
| `totaldeltapaidamount` | 55 | 0 | str:55 |  | 6 |
| `totalpatientpaidamount` | 55 | 0 | str:55 |  | 7 |
| `totaldeductibleamount` | 55 | 0 | str:55 |  | 4 |
| `totalpaidbyotherplanamount` | 55 | 0 | str:55 |  | 3 |
| `totalnotcoveredamount` | 55 | 0 | str:55 |  | 6 |

**Domain candidates:**
- `totalchargedamount`: distinct≈22 coverage=96% — top: `185.0` (12), `210.0` (11), `112.0` (7), `590.5` (3), `356.0` (2), `577.0` (2), `314.5` (2), `382.0` (2), `853.0` (1), `2054.5` (1)
- `totalapprovedamount`: distinct≈21 coverage=98% — top: `185.0` (12), `210.0` (10), `112.0` (7), `145.0` (5), `91.0` (3), `135.0` (2), `88.0` (2), `222.0` (1), `423.0` (1), `158.0` (1)
- `totalallowedamount`: distinct≈21 coverage=98% — top: `185.0` (12), `210.0` (10), `112.0` (7), `145.0` (5), `91.0` (3), `135.0` (2), `88.0` (2), `187.0` (1), `423.0` (1), `158.0` (1)
- `totaldeltapaidamount`: distinct≈23 coverage=94% — top: `148.0` (12), `105.0` (10), `56.0` (7), `145.0` (5), `91.0` (2), `135.0` (2), `91.4` (1), `173.0` (1), `158.0` (1), `0.0` (1)
- `totalpatientpaidamount`: distinct≈13 coverage=100% — top: `0.0` (17), `37.0` (12), `105.0` (10), `56.0` (7), `92.6` (1), `314.5` (1), `387.5` (1), `568.25` (1), `1868.12` (1), `581.88` (1)
- `totaldeductibleamount`: distinct≈3 coverage=100% — top: `0.0` (51), `50.0` (3), `75.0` (1)
- `totalpaidbyotherplanamount`: distinct≈1 coverage=100% — top: `0.0` (55)
- `totalnotcoveredamount`: distinct≈7 coverage=100% — top: `0.0` (49), `38.0` (1), `250.0` (1), `314.5` (1), `920.99` (1), `69.0` (1), `19.0` (1)

## Table `root__claims__procedurecountbystatus`
- Rows observed (for inference): 55
- Parent: `root__claims`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `denied` | 55 | 0 | str:55 |  | 2 |
| `fixable` | 55 | 0 | str:55 |  | 1 |
| `nonfixable` | 55 | 0 | str:55 |  | 2 |
| `submitted` | 55 | 0 | str:55 |  | 2 |

**Domain candidates:**
- `denied`: distinct≈5 coverage=100% — top: `0` (50), `1` (2), `10` (1), `3` (1), `2` (1)
- `fixable`: distinct≈1 coverage=100% — top: `0` (55)
- `nonfixable`: distinct≈5 coverage=100% — top: `0` (50), `1` (2), `10` (1), `3` (1), `2` (1)
- `submitted`: distinct≈10 coverage=100% — top: `1` (33), `6` (7), `3` (6), `5` (2), `7` (2), `14` (1), `9` (1), `4` (1), `8` (1), `2` (1)

## Table `root__claims__renderingprovider`
- Rows observed (for inference): 55
- Parent: `root__claims`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `id` | 55 | 0 | str:55 |  | 12 |
| `firstname` | 55 | 0 | str:55 |  | 8 |
| `middlename` | 55 | 0 | str:55 |  | 8 |
| `lastname` | 55 | 0 | str:55 |  | 10 |
| `taxid` | 55 | 0 | str:55 |  | 10 |
| `network` | 54 | 1 | str:54, null:1 |  | 4 |
| `licencenumber` | 55 | 0 | str:55 |  | 7 |
| `practicetype` | 55 | 0 | str:55 |  | 17 |
| `practicelocationid` | 55 | 0 | str:55 |  | 12 |
| `participationcode` | 55 | 0 | str:55 |  | 2 |
| `participationcodedescription` | 55 | 0 | str:55 |  | 7 |
| `key` | 55 | 0 | str:55 |  | 36 |
| `phonenumber` | 0 | 55 | null:55 |  |  |
| `practicelocationname` | 55 | 0 | str:55 |  | 47 |
| `npi` | 55 | 0 | str:55 |  | 10 |

**Domain candidates:**
- `id`: distinct≈3 coverage=100% — top: `PRV395994877` (33), `PRV978085565` (20), `PRV861914728` (2)
- `firstname`: distinct≈3 coverage=100% — top: `Ryan` (33), `Ali` (20), `Aderonke` (2)
- `middlename`: distinct≈3 coverage=100% — top: `Ngotcho` (33), `F` (20), `Oyinlola` (2)
- `lastname`: distinct≈3 coverage=100% — top: `Allo` (33), `Al-Alqeeli` (20), `Ogunbameru` (2)
- `taxid`: distinct≈1 coverage=100% — top: `******4771` (55)
- `network`: distinct≈1 coverage=100% — top: `2PPO` (54)
- `licencenumber`: distinct≈3 coverage=100% — top: `40128TX` (33), `37926TX` (20), `39047TX` (2)
- `practicetype`: distinct≈2 coverage=100% — top: `Orthodontist` (33), `Pediatric Dentist` (22)
- `practicelocationid`: distinct≈1 coverage=100% — top: `107313380005` (55)
- `participationcode`: distinct≈2 coverage=100% — top: `20` (54), `01` (1)
- `participationcodedescription`: distinct≈2 coverage=100% — top: `PPO` (54), `Premier` (1)
- `key`: distinct≈3 coverage=100% — top: `GRP107313380107313380005PRV395994877` (33), `GRP107313380107313380005PRV978085565` (20), `GRP107313380107313380005PRV861914728` (2)
- `practicelocationname`: distinct≈1 coverage=100% — top: `Park Place Pediatric Dentistry and Orthodontics` (55)
- `npi`: distinct≈3 coverage=100% — top: `1679345698` (33), `1861953077` (20), `1962827196` (2)

## Table `root__eligibility__wait`
- Rows observed (for inference): 2
- Parent: `root__eligibility`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__eligibility__pkg__member`
- Rows observed (for inference): 15
- Parent: `root__eligibility__pkg`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `enrolleeid` | 15 | 0 | str:15 |  | 12 |
| `contractid` | 15 | 0 | str:15 |  | 10 |
| `memberid` | 15 | 0 | str:15 |  | 2 |
| `personid` | 15 | 0 | str:15 |  | 16 |
| `membername` | 15 | 0 | str:15 |  | 16 |
| `birthdate` | 15 | 0 | date:15 |  |  |
| `groupnumber` | 15 | 0 | str:15 |  | 5 |
| `divisionnumber` | 15 | 0 | str:15 |  | 5 |
| `grouptypeidentifier` | 15 | 0 | str:15 |  | 10 |
| `healthcarecontractholderidentifier` | 15 | 0 | str:15 |  | 4 |
| `state` | 15 | 0 | str:15 |  | 2 |
| `product` | 15 | 0 | str:15 |  | 8 |
| `effectivedate` | 15 | 0 | date:15 |  |  |

**Domain candidates:**
- `enrolleeid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)
- `contractid`: distinct≈14 coverage=100% — top: `1253850786` (2), `1227667420` (1), `1164994572` (1), `1230703916` (1), `1166682649` (1), `1136810514` (1), `1146654718` (1), `0021754618` (1), `1225988044` (1), `1139666015` (1)
- `memberid`: distinct≈4 coverage=100% — top: `02` (7), `03` (4), `05` (2), `04` (2)
- `personid`: distinct≈15 coverage=100% — top: `0227112413070852` (1), `0357971512224895` (1), `0279020412412638` (1), `0474520312240237` (1), `0890990112222698` (1), `0523210814452330` (1), `0470212513115331` (1), `0676010209113380` (1), `0390420412412656` (1), `0894382519294903` (1)
- `membername`: distinct≈15 coverage=100% — top: `Alexander Luke` (1), `Ava Emerson` (1), `Cecilia Garcia` (1), `Darod Harris` (1), `Dean Smith` (1), `Declan Barnes` (1), `Emily Scott` (1), `Estelle Mazet` (1), `Isabella Garcia` (1), `Janiece Anderson` (1)
- `birthdate`: distinct≈15 coverage=100% — top: `09/06/2008` (1), `06/07/2019` (1), `02/05/2019` (1), `01/19/2024` (1), `07/16/2015` (1), `01/26/2014` (1), `06/05/2013` (1), `10/19/2011` (1), `12/15/2017` (1), `09/18/2018` (1)
- `groupnumber`: distinct≈14 coverage=100% — top: `23123` (2), `03784` (1), `17870` (1), `20132` (1), `04170` (1), `15975` (1), `05968` (1), `03199` (1), `18821` (1), `12316` (1)
- `divisionnumber`: distinct≈11 coverage=100% — top: `00001` (5), `01006` (1), `00002` (1), `11000` (1), `00201` (1), `20001` (1), `00007` (1), `01563` (1), `10091` (1), `01001` (1)
- `grouptypeidentifier`: distinct≈2 coverage=100% — top: `GROUP` (14), `INDIVIDUAL` (1)
- `healthcarecontractholderidentifier`: distinct≈3 coverage=100% — top: `DDIC` (12), `DDP` (2), `DDNY` (1)
- `state`: distinct≈4 coverage=100% — top: `TX` (11), `PA` (2), `FL` (1), `NY` (1)
- `product`: distinct≈2 coverage=100% — top: `PPO` (14), `1N12PLUS` (1)
- `effectivedate`: distinct≈4 coverage=100% — top: `09/21/2025` (12), `03/01/2025` (1), `12/31/2024` (1), `09/22/2025` (1)

## Table `root__eligibility__pkg__networksallowed`
- Rows observed (for inference): 45
- Parent: `root__eligibility__pkg`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 45 | 0 | int:45 | 0|2 |  |
| `code` | 45 | 0 | str:45 |  | 5 |
| `description` | 45 | 0 | str:45 |  | 28 |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (15), `1` (15), `2` (15)
- `code`: distinct≈3 coverage=100% — top: `##PPO` (15), `##PMR` (15), `##NP` (15)
- `description`: distinct≈4 coverage=100% — top: `Delta Dental Premier Dentist` (15), `Non-Delta Dental Dentist` (15), `Delta Dental PPO Dentist` (11), `Delta Dental DPO Dentist` (4)

## Table `root__eligibility__pkg__treatment`
- Rows observed (for inference): 168
- Parent: `root__eligibility__pkg`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 168 | 0 | int:168 | 0|11 |  |
| `treatmentcode` | 168 | 0 | str:168 |  | 2 |
| `treatmentdescription` | 168 | 0 | str:168 |  | 29 |
| `treatmentbusinessdescription` | 168 | 0 | str:168 |  | 40 |

**Domain candidates:**
- `ordinal`: distinct≈12 coverage=100% — top: `0` (15), `1` (15), `2` (15), `3` (15), `4` (15), `5` (15), `6` (15), `7` (15), `8` (15), `9` (15)
- `treatmentcode`: distinct≈13 coverage=100% — top: `DI` (15), `EN` (15), `GS` (15), `OS` (15), `PD` (15), `PF` (15), `PR` (15), `PV` (15), `RS` (15), `IS` (14)
- `treatmentdescription`: distinct≈13 coverage=100% — top: `Diagnostic` (15), `Endodontics` (15), `Adjunctive General Services` (15), `Oral & Maxillofacial Surgery` (15), `Periodontics` (15), `Prosthodontics; Fixed` (15), `Prosthodontics; Removable` (15), `Preventive` (15), `Restorative` (15), `Implant Services` (14)
- `treatmentbusinessdescription`: distinct≈13 coverage=100% — top: `Oral Exams and X-Rays` (15), `Root Canals` (15), `Miscellaneous Services` (15), `Tooth Extraction` (15), `Gum Treatment` (15), `Inlays, Onlays, Bridges` (15), `Partial Dentures, Full Dentures` (15), `Routine Cleanings and Fluoride Treatment` (15), `Restorative Procedures` (15), `Implant Related Services` (14)

## Table `root__eligibility__maxded__memberinfo`
- Rows observed (for inference): 15
- Parent: `root__eligibility__maxded`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `enrolleeid` | 15 | 0 | str:15 |  | 12 |
| `contractid` | 15 | 0 | str:15 |  | 10 |
| `personid` | 15 | 0 | str:15 |  | 16 |
| `benefitpackageid` | 15 | 0 | str:15 |  | 8 |
| `membername` | 15 | 0 | str:15 |  | 16 |
| `birthdate` | 15 | 0 | date:15 |  |  |
| `age` | 15 | 0 | str:15 |  | 2 |
| `groupnumber` | 15 | 0 | str:15 |  | 5 |
| `divisionnumber` | 15 | 0 | str:15 |  | 5 |
| `defaultnetwork` | 15 | 0 | str:15 |  | 5 |

**Domain candidates:**
- `enrolleeid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)
- `contractid`: distinct≈14 coverage=100% — top: `1253850786` (2), `1227667420` (1), `1164994572` (1), `1230703916` (1), `1166682649` (1), `1136810514` (1), `1146654718` (1), `0021754618` (1), `1225988044` (1), `1139666015` (1)
- `personid`: distinct≈15 coverage=100% — top: `0227112413070852` (1), `0357971512224895` (1), `0279020412412638` (1), `0474520312240237` (1), `0890990112222698` (1), `0523210814452330` (1), `0470212513115331` (1), `0676010209113380` (1), `0390420412412656` (1), `0894382519294903` (1)
- `benefitpackageid`: distinct≈14 coverage=100% — top: `PDN10695` (2), `PDN07520` (1), `PEG08751` (1), `PDN08878` (1), `PCN11030` (1), `P0096384` (1), `PCN10137` (1), `PDN09013` (1), `P0097676` (1), `P0019355` (1)
- `membername`: distinct≈15 coverage=100% — top: `Alexander Luke` (1), `Ava Emerson` (1), `Cecilia Garcia` (1), `Darod Harris` (1), `Dean Smith` (1), `Declan Barnes` (1), `Emily Scott` (1), `Estelle Mazet` (1), `Isabella Garcia` (1), `Janiece Anderson` (1)
- `birthdate`: distinct≈15 coverage=100% — top: `09/06/2008` (1), `06/07/2019` (1), `02/05/2019` (1), `01/19/2024` (1), `07/16/2015` (1), `01/26/2014` (1), `06/05/2013` (1), `10/19/2011` (1), `12/15/2017` (1), `09/18/2018` (1)
- `age`: distinct≈11 coverage=100% — top: `6` (2), `1` (2), `10` (2), `7` (2), `17` (1), `11` (1), `12` (1), `13` (1), `15` (1), `9` (1)
- `groupnumber`: distinct≈14 coverage=100% — top: `23123` (2), `03784` (1), `17870` (1), `20132` (1), `04170` (1), `15975` (1), `05968` (1), `03199` (1), `18821` (1), `12316` (1)
- `divisionnumber`: distinct≈11 coverage=100% — top: `00001` (5), `01006` (1), `00002` (1), `11000` (1), `00201` (1), `20001` (1), `00007` (1), `01563` (1), `10091` (1), `01001` (1)
- `defaultnetwork`: distinct≈1 coverage=100% — top: `##PPO` (15)

## Table `root__eligibility__maxded__maximumsinfo`
- Rows observed (for inference): 29
- Parent: `root__eligibility__maxded`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 29 | 0 | int:29 | 0|2 |  |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (15), `1` (13), `2` (1)

## Table `root__eligibility__maxded__deductiblesinfo`
- Rows observed (for inference): 31
- Parent: `root__eligibility__maxded`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 31 | 0 | int:31 | 0|3 |  |

**Domain candidates:**
- `ordinal`: distinct≈4 coverage=100% — top: `0` (14), `1` (12), `2` (4), `3` (1)

## Table `root__eligibility__addl__additionalbenefits`
- Rows observed (for inference): 174
- Parent: `root__eligibility__addl`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 174 | 0 | int:174 | 0|12 |  |
| `header` | 174 | 0 | str:174 |  | 28 |
| `text` | 174 | 0 | str:174 |  | 363 |

**Domain candidates:**
- `ordinal`: distinct≈13 coverage=100% — top: `0` (15), `1` (15), `2` (15), `3` (15), `4` (15), `5` (15), `6` (15), `7` (15), `8` (15), `9` (15)
- `header`: distinct≈15 coverage=100% — top: `Basis of Payment` (15), `Child Contract Age Limit` (15), `Student Contract Age Limit` (15), `Missing Tooth Coverage` (15), `Orthodontic Age Limit` (15), `Group Internal Dual Coverage` (15), `COB Rule` (15), `Removal of Impacted Teeth` (15), `Assignment of Benefits` (14), `Orthodontic Payment` (14)
- `text`: distinct≈34 coverage=91% — top: `Benefits for prior extractions and missing teeth are included in this plan.` (14), `Standard: Coordination of Benefits (COB) is calculated by the lesser of the two: either the other insurance coverage (OIC) remaining allowed amount or the secondary plan's liability.` (14), `Group accepts assignment of benefits.` (14), `PPO Providers (DPO in the state of Texas) are reimbursed at the PPO schedule and Premier Providers are reimbursed at their Premier schedule. A member’s out of pocket costs are higher when treated by a Premier or Non-Delta Provider.` (13), `Click here for age limits.;Child and adult ;no age limit` (13), `If the removal of impacted teeth with procedure codes D7220, D7230, D7240 or D7241 is covered under your plan, claims should first be submitted to your dental plan.` (13), `Children are eligible to receive coverage until the end of the month that they turn 26.` (12), `Students are eligible to receive coverage until the end of the month that they turn 26.` (12), `This program allows an additional cleaning benefit during pregnancy.` (10), `N/A` (9)

## Table `root__eligibility__hist__criteria`
- Rows observed (for inference): 14
- Parent: `root__eligibility__hist`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `enrolleeid` | 14 | 0 | str:14 |  | 12 |

**Domain candidates:**
- `enrolleeid`: distinct≈14 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)

## Table `root__eligibility__hist__enrollees`
- Rows observed (for inference): 14
- Parent: `root__eligibility__hist`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__eligibility__hist__procedures`
- Rows observed (for inference): 182
- Parent: `root__eligibility__hist`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 182 | 0 | int:182 | 0|21 |  |
| `code` | 182 | 0 | str:182 |  | 5 |
| `description` | 182 | 0 | str:182 |  | 139 |
| `firstservicedate` | 182 | 0 | date:182 |  |  |
| `lastservicedate` | 182 | 0 | date:182 |  |  |
| `numberofservicesrendered` | 182 | 0 | str:182 |  | 2 |

**Domain candidates:**
- `ordinal`: distinct≈22 coverage=97% — top: `0` (14), `1` (14), `2` (14), `3` (14), `4` (11), `5` (11), `6` (10), `7` (10), `8` (9), `9` (9)
- `code`: distinct≈41 coverage=84% — top: `D0120` (14), `D1120` (14), `D1206` (14), `D0220` (11), `D0230` (11), `D0272` (10), `D0210` (8), `D1208` (8), `D1351` (8), `D0274` (7)
- `description`: distinct≈41 coverage=84% — top: `Periodic oral evaluation - established patient` (14), `Prophylaxis (cleaning) - child` (14), `Topical application of fluoride varnish` (14), `Intraoral - periapical first radiographic image` (11), `Intraoral - periapical each additional radiographic image` (11), `Bitewings - two radiographic images` (10), `Intraoral - comprehensive series of radiographic images` (8), `Topical application of fluoride - excluding varnish` (8), `Sealant - per tooth` (8), `Bitewings - four radiographic images` (7)
- `numberofservicesrendered`: distinct≈18 coverage=100% — top: `1` (51), `2` (38), `3` (20), `4` (17), `8` (11), `7` (8), `6` (7), `10` (6), `5` (5), `13` (4)

## Table `root__eligibility__mails__criteria`
- Rows observed (for inference): 15
- Parent: `root__eligibility__mails`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `enrolleeid` | 15 | 0 | str:15 |  | 12 |

**Domain candidates:**
- `enrolleeid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)

## Table `root__eligibility__mails__addresses`
- Rows observed (for inference): 15
- Parent: `root__eligibility__mails`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 15 | 0 | int:15 | 0|0 |  |
| `groupnumber` | 15 | 0 | str:15 |  | 5 |
| `divisionnumber` | 15 | 0 | str:15 |  | 5 |
| `grouptypeid` | 15 | 0 | str:15 |  | 10 |
| `contractholderid` | 15 | 0 | str:15 |  | 4 |
| `enrolleeid` | 15 | 0 | str:15 |  | 12 |
| `contractid` | 15 | 0 | str:15 |  | 10 |
| `company` | 15 | 0 | str:15 |  | 30 |
| `address` | 15 | 0 | str:15 |  | 13 |
| `city` | 15 | 0 | str:15 |  | 13 |
| `state` | 15 | 0 | str:15 |  | 2 |
| `zipcode` | 15 | 0 | str:15 |  | 10 |
| `claimpayerid` | 15 | 0 | str:15 |  | 5 |

**Domain candidates:**
- `ordinal`: distinct≈1 coverage=100% — top: `0` (15)
- `groupnumber`: distinct≈14 coverage=100% — top: `23123` (2), `03784` (1), `17870` (1), `20132` (1), `04170` (1), `15975` (1), `05968` (1), `03199` (1), `18821` (1), `12316` (1)
- `divisionnumber`: distinct≈11 coverage=100% — top: `00001` (5), `01006` (1), `00002` (1), `11000` (1), `00201` (1), `20001` (1), `00007` (1), `01563` (1), `10091` (1), `01001` (1)
- `grouptypeid`: distinct≈2 coverage=100% — top: `GROUP` (14), `INDIVIDUAL` (1)
- `contractholderid`: distinct≈3 coverage=100% — top: `DDIC` (12), `DDP` (2), `DDNY` (1)
- `enrolleeid`: distinct≈15 coverage=100% — top: `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1), `122598804402` (1)
- `contractid`: distinct≈14 coverage=100% — top: `1253850786` (2), `1227667420` (1), `1164994572` (1), `1230703916` (1), `1166682649` (1), `1136810514` (1), `1146654718` (1), `0021754618` (1), `1225988044` (1), `1139666015` (1)
- `company`: distinct≈2 coverage=100% — top: `Delta Dental Insurance Company` (12), `Delta Dental` (3)
- `address`: distinct≈3 coverage=100% — top: `P.O. Box 1809` (11), `P.O. Box 2105` (3), `PO Box 1809` (1)
- `city`: distinct≈2 coverage=100% — top: `Alpharetta` (12), `Mechanicsburg` (3)
- `state`: distinct≈2 coverage=100% — top: `GA` (12), `PA` (3)
- `zipcode`: distinct≈2 coverage=100% — top: `30023-1809` (12), `17055` (3)
- `claimpayerid`: distinct≈3 coverage=100% — top: `94276` (12), `23166` (2), `11198` (1)

## Table `root__eligibility__persons__persons`
- Rows observed (for inference): 15
- Parent: `root__eligibility__persons`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 15 | 0 | int:15 | 0|0 |  |
| `personid` | 15 | 0 | str:15 |  | 16 |
| `gender` | 15 | 0 | str:15 |  | 6 |
| `birthdate` | 15 | 0 | date:15 |  |  |
| `socialsecuritynumber` | 13 | 0 | str:13 |  | 5 |
| `primarylanguage` | 15 | 0 | str:15 |  | 12 |
| `secondarylanguage` | 15 | 0 | str:15 |  | 12 |

**Domain candidates:**
- `ordinal`: distinct≈1 coverage=100% — top: `0` (15)
- `personid`: distinct≈15 coverage=100% — top: `0227112413070852` (1), `0357971512224895` (1), `0279020412412638` (1), `0474520312240237` (1), `0890990112222698` (1), `0523210814452330` (1), `0470212513115331` (1), `0676010209113380` (1), `0390420412412656` (1), `0894382519294903` (1)
- `gender`: distinct≈2 coverage=100% — top: `Female` (8), `Male` (7)
- `birthdate`: distinct≈15 coverage=100% — top: `09/06/2008` (1), `06/07/2019` (1), `02/05/2019` (1), `01/19/2024` (1), `07/16/2015` (1), `01/26/2014` (1), `06/05/2013` (1), `10/19/2011` (1), `12/15/2017` (1), `09/18/2018` (1)
- `socialsecuritynumber`: distinct≈1 coverage=100% — top: `*****` (13)
- `primarylanguage`: distinct≈2 coverage=100% — top: `Not Provided` (14), `English` (1)
- `secondarylanguage`: distinct≈1 coverage=100% — top: `Not Provided` (15)

## Table `root__claims__renderingprovider__contacts`
- Rows observed (for inference): 55
- Parent: `root__claims__renderingprovider`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `phonenumber` | 55 | 0 | str:55 |  | 10 |

**Domain candidates:**
- `phonenumber`: distinct≈1 coverage=100% — top: `8174651888` (55)

## Table `root__eligibility__wait__enrollee`
- Rows observed (for inference): 2
- Parent: `root__eligibility__wait`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `contractid` | 2 | 0 | str:2 |  | 10 |
| `memberid` | 2 | 0 | str:2 |  | 2 |

**Domain candidates:**
- `contractid`: distinct≈2 coverage=100% — top: `1225988044` (1), `1229991898` (1)
- `memberid`: distinct≈1 coverage=100% — top: `02` (2)

## Table `root__eligibility__wait__waitingperiods`
- Rows observed (for inference): 4
- Parent: `root__eligibility__wait`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 4 | 0 | int:4 | 0|1 |  |
| `effectivedate` | 4 | 0 | date:4 |  |  |
| `enddate` | 4 | 0 | date:4 |  |  |
| `waitingperiodinmonths` | 4 | 0 | int:4 | 6|12 |  |

**Domain candidates:**
- `ordinal`: distinct≈2 coverage=100% — top: `0` (2), `1` (2)
- `effectivedate`: distinct≈2 coverage=100% — top: `09/01/2022` (2), `01/01/2023` (2)
- `enddate`: distinct≈4 coverage=100% — top: `02/28/2023` (1), `08/31/2023` (1), `06/30/2023` (1), `12/31/2023` (1)
- `waitingperiodinmonths`: distinct≈2 coverage=100% — top: `6` (2), `12` (2)

## Table `root__eligibility__pkg__treatment__summaryvalues`
- Rows observed (for inference): 504
- Parent: `root__eligibility__pkg__treatment`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 504 | 0 | int:504 | 0|2 |  |
| `minimumcoverage` | 504 | 0 | int:504 | 40|100 |  |
| `maximumcoverage` | 504 | 0 | int:504 | 40|100 |  |
| `networkcode` | 504 | 0 | str:504 |  | 5 |
| `amounttype` | 504 | 0 | str:504 |  | 7 |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (168), `1` (168), `2` (168)
- `minimumcoverage`: distinct≈8 coverage=100% — top: `50` (270), `80` (86), `100` (55), `60` (46), `65` (18), `95` (12), `40` (9), `90` (8)
- `maximumcoverage`: distinct≈9 coverage=100% — top: `80` (170), `100` (144), `50` (114), `90` (22), `60` (21), `95` (21), `65` (6), `40` (4), `70` (2)
- `networkcode`: distinct≈3 coverage=100% — top: `##NP` (168), `##PMR` (168), `##PPO` (168)
- `amounttype`: distinct≈1 coverage=100% — top: `PERCENT` (504)

## Table `root__eligibility__pkg__treatment__procedureclass`
- Rows observed (for inference): 952
- Parent: `root__eligibility__pkg__treatment`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 952 | 0 | int:952 | 0|8 |  |
| `summarycategorycode` | 952 | 0 | str:952 |  | 2 |
| `summarycategorydescription` | 952 | 0 | str:952 |  | 29 |
| `classificationcode` | 952 | 0 | str:952 |  | 2 |
| `classificationdescription` | 952 | 0 | str:952 |  | 80 |

**Domain candidates:**
- `ordinal`: distinct≈9 coverage=100% — top: `0` (168), `1` (165), `2` (163), `3` (141), `4` (118), `5` (94), `6` (63), `7` (25), `8` (15)
- `summarycategorycode`: distinct≈16 coverage=100% — top: `P` (195), `OS` (114), `EN` (105), `GS` (88), `OR` (79), `PV` (75), `DI` (73), `BR` (60), `IS` (42), `PD` (38)
- `summarycategorydescription`: distinct≈16 coverage=100% — top: `Prosthodontics` (195), `Oral & Maxillofacial Surgery` (114), `Endodontics` (105), `Adjunctive General Services` (88), `Orthodontics` (79), `Preventive` (75), `Diagnostic` (73), `Basic Restorative` (60), `Implant Services` (42), `Periodontics` (38)

## Table `root__eligibility__maxded__memberinfo__oopmdetails`
- Rows observed (for inference): 15
- Parent: `root__eligibility__maxded__memberinfo`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `flag` | 15 | 0 | bool:15 |  |  |

**Domain candidates:**
- `flag`: distinct≈1 coverage=100% — top: `False` (15)

## Table `root__eligibility__maxded__memberinfo__networksallowed`
- Rows observed (for inference): 45
- Parent: `root__eligibility__maxded__memberinfo`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 45 | 0 | int:45 | 0|2 |  |
| `code` | 45 | 0 | str:45 |  | 5 |
| `description` | 45 | 0 | str:45 |  | 28 |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (15), `1` (15), `2` (15)
- `code`: distinct≈3 coverage=100% — top: `##PPO` (15), `##PMR` (15), `##NP` (15)
- `description`: distinct≈4 coverage=100% — top: `Delta Dental Premier Dentist` (15), `Non-Delta Dental Dentist` (15), `Delta Dental PPO Dentist` (11), `Delta Dental DPO Dentist` (4)

## Table `root__eligibility__maxded__maximumsinfo__maximumdetails`
- Rows observed (for inference): 29
- Parent: `root__eligibility__maxded__maximumsinfo`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `type` | 29 | 0 | str:29 |  | 27 |
| `calendarorcontractclassification` | 29 | 0 | str:29 |  | 8 |
| `accumperiodstartdate` | 16 | 0 | date:16 |  |  |
| `accumperiodenddate` | 16 | 0 | date:16 |  |  |
| `maximumkeyword` | 29 | 0 | str:29 |  | 20 |
| `maximumcounterid` | 29 | 0 | str:29 |  | 9 |
| `highagerange` | 29 | 0 | bool:29 |  |  |

**Domain candidates:**
- `type`: distinct≈3 coverage=100% — top: `Calendar Individual Maximum` (14), `Lifetime Individual Maximum` (13), `Contract Individual Maximum` (2)
- `calendarorcontractclassification`: distinct≈3 coverage=100% — top: `CALENDAR` (14), `LIFETIME` (13), `CONTRACT` (2)
- `accumperiodstartdate`: distinct≈3 coverage=100% — top: `2025-01-01` (13), `2025-09-01` (2), `2024-01-01` (1)
- `accumperiodenddate`: distinct≈3 coverage=100% — top: `2025-12-31` (13), `2026-08-31` (2), `2024-12-31` (1)
- `maximumkeyword`: distinct≈14 coverage=100% — top: `LTCYMX2000` (6), `LTLFOR1000` (4), `LTCYMX1500` (3), `LTLFOR1500` (3), `LTCYMX1750` (2), `LTLFOR2000` (2), `LTCYMX1000` (2), `LTCNMX2000` (1), `LTLFOR2500` (1), `LTCNMX3000` (1)
- `maximumcounterid`: distinct≈4 coverage=100% — top: `CALYRMXN` (13), `LFTORMXN` (13), `CONYRMXN` (2), `CALYRMAXN` (1)
- `highagerange`: distinct≈2 coverage=100% — top: `True` (16), `False` (13)

## Table `root__eligibility__maxded__maximumsinfo__servicesallowed`
- Rows observed (for inference): 177
- Parent: `root__eligibility__maxded__maximumsinfo`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 177 | 0 | int:177 | 0|11 |  |
| `treatmenttypecode` | 177 | 0 | str:177 |  | 2 |
| `treatmenttypedescription` | 177 | 0 | str:177 |  | 29 |
| `networksapplicable` | 177 | 0 | str:177 |  | 16 |

**Domain candidates:**
- `ordinal`: distinct≈12 coverage=100% — top: `0` (28), `1` (25), `2` (19), `3` (15), `4` (15), `5` (15), `6` (15), `7` (15), `8` (15), `9` (10)
- `treatmenttypecode`: distinct≈13 coverage=100% — top: `OS` (25), `DI` (19), `EN` (15), `GS` (15), `PD` (15), `PF` (15), `PR` (15), `RS` (15), `OR` (15), `IS` (14)
- `treatmenttypedescription`: distinct≈13 coverage=100% — top: `Oral & Maxillofacial Surgery` (25), `Diagnostic` (19), `Endodontics` (15), `Adjunctive General Services` (15), `Periodontics` (15), `Prosthodontics; Fixed` (15), `Prosthodontics; Removable` (15), `Restorative` (15), `Orthodontics` (15), `Implant Services` (14)
- `networksapplicable`: distinct≈1 coverage=100% — top: `##NP,##PMR,##PPO` (177)

## Table `root__eligibility__maxded__maximumsinfo__amountinfo`
- Rows observed (for inference): 29
- Parent: `root__eligibility__maxded__maximumsinfo`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `totalamount` | 29 | 0 | int:29 | 1000|3000 |  |
| `totalusedamount` | 29 | 0 | float:4, int:25 | 0|2784 |  |
| `remainingamount` | 29 | 0 | float:4, int:25 | 0|3000 |  |
| `useddentalamount` | 29 | 0 | int:29 | 0|0 |  |
| `usedmedicalamount` | 29 | 0 | int:29 | 0|0 |  |
| `lastcounteruseddate` | 14 | 0 | date:14 |  |  |

**Domain candidates:**
- `totalamount`: distinct≈7 coverage=100% — top: `2000` (10), `1500` (6), `1000` (6), `1750` (3), `3000` (2), `2500` (1), `1250` (1)
- `totalusedamount`: distinct≈15 coverage=100% — top: `0` (15), `264.4` (1), `226` (1), `88` (1), `1362.5` (1), `145` (1), `462.25` (1), `2784` (1), `568` (1), `1000` (1)
- `remainingamount`: distinct≈18 coverage=100% — top: `2000` (6), `1500` (4), `1000` (3), `0` (2), `1235.6` (1), `1524` (1), `1412` (1), `637.5` (1), `1855` (1), `2037.75` (1)
- `useddentalamount`: distinct≈1 coverage=100% — top: `0` (29)
- `usedmedicalamount`: distinct≈1 coverage=100% — top: `0` (29)
- `lastcounteruseddate`: distinct≈12 coverage=100% — top: `2025-08-14` (3), `2025-09-16` (1), `2025-02-20` (1), `2025-07-30` (1), `2025-08-07` (1), `2025-08-25` (1), `2025-09-09` (1), `2025-04-28` (1), `2025-09-06` (1), `2025-08-19` (1)

## Table `root__eligibility__maxded__deductiblesinfo__deductibledetails`
- Rows observed (for inference): 31
- Parent: `root__eligibility__maxded__deductiblesinfo`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `type` | 31 | 0 | str:31 |  | 31 |
| `calendarorcontractclassification` | 31 | 0 | str:31 |  | 15 |
| `accumperiodstartdate` | 29 | 0 | date:29 |  |  |
| `accumperiodenddate` | 29 | 0 | date:29 |  |  |
| `deductiblekeyword` | 31 | 0 | str:31 |  | 10 |
| `deductiblecounterid` | 31 | 0 | str:31 |  | 8 |
| `highagerange` | 31 | 0 | bool:31 |  |  |

**Domain candidates:**
- `type`: distinct≈7 coverage=100% — top: `Calendar Individual Deductible` (13), `Calendar Family Deductible` (10), `Lifetime Individual Deductible` (2), `Carryover Family Deductible` (2), `Carryover Individual Deductible` (2), `Contract Family Deductible` (1), `Contract Individual Deductible` (1)
- `calendarorcontractclassification`: distinct≈4 coverage=100% — top: `CALENDAR` (23), `CALENDAR-CAROVR` (4), `CONTRACT` (2), `LIFETIME` (2)
- `accumperiodstartdate`: distinct≈4 coverage=100% — top: `2025-01-01` (21), `2024-10-01` (4), `2025-09-01` (2), `2024-01-01` (2)
- `accumperiodenddate`: distinct≈3 coverage=100% — top: `2025-12-31` (25), `2026-08-31` (2), `2024-12-31` (2)
- `deductiblekeyword`: distinct≈8 coverage=100% — top: `TKDCY50150` (18), `TKDCYIND50` (2), `TKDCN75225` (2), `TKDCY50100` (2), `TKDLFIOR50` (2), `TKDCZ50150` (2), `TKDZ100300` (2), `TKDCYIOR50` (1)
- `deductiblecounterid`: distinct≈6 coverage=100% — top: `MBCYDEDN` (14), `FMCYDEDN` (12), `MBLFDEDN` (2), `FMCNDEDN` (1), `MBCNDEDN` (1), `MBORCY50` (1)
- `highagerange`: distinct≈2 coverage=100% — top: `True` (29), `False` (2)

## Table `root__eligibility__maxded__deductiblesinfo__servicesallowed`
- Rows observed (for inference): 278
- Parent: `root__eligibility__maxded__deductiblesinfo`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 278 | 0 | int:278 | 0|10 |  |
| `treatmenttypecode` | 278 | 0 | str:278 |  | 2 |
| `treatmenttypedescription` | 278 | 0 | str:278 |  | 29 |
| `networksapplicable` | 278 | 0 | str:278 |  | 16 |

**Domain candidates:**
- `ordinal`: distinct≈11 coverage=100% — top: `0` (31), `1` (31), `2` (29), `3` (28), `4` (28), `5` (28), `6` (28), `7` (28), `8` (28), `9` (12)
- `treatmenttypecode`: distinct≈13 coverage=100% — top: `OS` (31), `DI` (29), `EN` (28), `GS` (28), `PD` (28), `PF` (28), `PR` (28), `RS` (28), `IS` (26), `OR` (12)
- `treatmenttypedescription`: distinct≈13 coverage=100% — top: `Oral & Maxillofacial Surgery` (31), `Diagnostic` (29), `Endodontics` (28), `Adjunctive General Services` (28), `Periodontics` (28), `Prosthodontics; Fixed` (28), `Prosthodontics; Removable` (28), `Restorative` (28), `Implant Services` (26), `Orthodontics` (12)
- `networksapplicable`: distinct≈4 coverage=100% — top: `##NP,##PMR,##PPO` (220), `##NP` (22), `##NP,##PMR` (18), `##PMR,##PPO` (18)

## Table `root__eligibility__maxded__deductiblesinfo__amountinfo`
- Rows observed (for inference): 31
- Parent: `root__eligibility__maxded__deductiblesinfo`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `totalamount` | 31 | 0 | int:31 | 50|300 |  |
| `totalusedamount` | 31 | 0 | int:31 | 0|100 |  |
| `remainingamount` | 31 | 0 | int:31 | 0|250 |  |
| `useddentalamount` | 31 | 0 | int:31 | 0|0 |  |
| `usedmedicalamount` | 31 | 0 | int:31 | 0|0 |  |
| `lastcounteruseddate` | 12 | 0 | date:12 |  |  |

**Domain candidates:**
- `totalamount`: distinct≈6 coverage=100% — top: `50` (16), `150` (10), `100` (2), `225` (1), `75` (1), `300` (1)
- `totalusedamount`: distinct≈3 coverage=100% — top: `0` (19), `50` (10), `100` (2)
- `remainingamount`: distinct≈7 coverage=100% — top: `50` (14), `100` (7), `0` (4), `150` (3), `225` (1), `75` (1), `250` (1)
- `useddentalamount`: distinct≈1 coverage=100% — top: `0` (31)
- `usedmedicalamount`: distinct≈1 coverage=100% — top: `0` (31)
- `lastcounteruseddate`: distinct≈7 coverage=100% — top: `2025-09-16` (2), `2025-05-12` (2), `2025-08-25` (2), `2025-08-19` (2), `2025-07-23` (2), `2025-06-10` (1), `2025-02-03` (1)

## Table `root__eligibility__hist__enrollees__ids`
- Rows observed (for inference): 20
- Parent: `root__eligibility__hist__enrollees`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 20 | 0 | int:20 | 0|4 |  |
| `value` | 20 | 0 | str:20 |  | 12 |

**Domain candidates:**
- `ordinal`: distinct≈5 coverage=100% — top: `0` (14), `1` (3), `2` (1), `3` (1), `4` (1)
- `value`: distinct≈20 coverage=100% — top: `113369873602` (1), `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1)

## Table `root__eligibility__hist__procedures__services`
- Rows observed (for inference): 788
- Parent: `root__eligibility__hist__procedures`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 788 | 0 | int:788 | 0|20 |  |
| `claimid` | 788 | 0 | str:788 |  | 15 |
| `servicedate` | 788 | 0 | date:788 |  |  |
| `statuscode` | 788 | 0 | str:788 |  | 3 |
| `statuscodedescription` | 788 | 0 | str:788 |  | 15 |
| `toothcode` | 128 | 0 | str:128 |  | 2 |
| `toothdescription` | 128 | 0 | str:128 |  | 36 |

**Domain candidates:**
- `ordinal`: distinct≈21 coverage=99% — top: `0` (182), `1` (131), `2` (93), `3` (73), `4` (56), `5` (51), `6` (44), `7` (36), `8` (25), `9` (22)
- `statuscode`: distinct≈3 coverage=100% — top: `120` (712), `110` (61), `140` (15)
- `statuscodedescription`: distinct≈3 coverage=100% — top: `System approved` (712), `System denied` (61), `Manual deny` (15)
- `toothcode`: distinct≈31 coverage=91% — top: `03` (12), `19` (11), `14` (9), `30` (9), `J` (9), `A` (9), `H` (9), `L` (8), `K` (7), `I` (6)
- `toothdescription`: distinct≈31 coverage=91% — top: `Upper Right 1st Molar` (12), `Lower Left 1st Molar` (11), `Upper Left 1st Molar` (9), `Lower Right 1st Molar` (9), `Upper Left Deciduous 2nd Molar` (9), `Upper Right Deciduous Second Molar` (9), `Upper Left Deciduous Cuspid` (9), `Lower Left Deciduous 1st Molar` (8), `Lower Left Deciduous 2nd Molar` (7), `Upper Left Deciduous 1st Molar` (6)

## Table `root__eligibility__persons__persons__name`
- Rows observed (for inference): 15
- Parent: `root__eligibility__persons__persons`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `firstname` | 15 | 0 | str:15 |  | 9 |
| `lastname` | 15 | 0 | str:15 |  | 8 |
| `middlename` | 5 | 0 | str:5 |  | 1 |

**Domain candidates:**
- `firstname`: distinct≈15 coverage=100% — top: `Alexander` (1), `Ava` (1), `Cecilia` (1), `Darod` (1), `Dean` (1), `Declan` (1), `Emily` (1), `Estelle` (1), `Isabella` (1), `Janiece` (1)
- `lastname`: distinct≈14 coverage=100% — top: `Garcia` (2), `Luke` (1), `Emerson` (1), `Harris` (1), `Smith` (1), `Barnes` (1), `Scott` (1), `Mazet` (1), `Anderson` (1), `Dalton` (1)
- `middlename`: distinct≈3 coverage=100% — top: `R` (2), `C` (2), `O` (1)

## Table `root__eligibility__persons__persons__enrollees`
- Rows observed (for inference): 15
- Parent: `root__eligibility__persons__persons`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|

## Table `root__claims__renderingprovider__contacts__address`
- Rows observed (for inference): 55
- Parent: `root__claims__renderingprovider__contacts`

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `line1` | 55 | 0 | str:55 |  | 23 |
| `city` | 55 | 0 | str:55 |  | 9 |
| `state` | 55 | 0 | str:55 |  | 2 |
| `zipcode` | 55 | 0 | str:55 |  | 9 |

**Domain candidates:**
- `line1`: distinct≈1 coverage=100% — top: `3602 Matlock Rd Ste 208` (55)
- `city`: distinct≈1 coverage=100% — top: `Arlington` (55)
- `state`: distinct≈1 coverage=100% — top: `TX` (55)
- `zipcode`: distinct≈1 coverage=100% — top: `760153600` (55)

## Table `root__eligibility__wait__waitingperiods__conditioncodes`
- Rows observed (for inference): 7
- Parent: `root__eligibility__wait__waitingperiods`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 7 | 0 | int:7 | 0|2 |  |
| `conditioncode` | 7 | 0 | str:7 |  | 3 |
| `description` | 7 | 0 | str:7 |  | 34 |
| `explanationcode` | 7 | 0 | str:7 |  | 4 |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (4), `1` (2), `2` (1)
- `conditioncode`: distinct≈6 coverage=100% — top: `OR` (2), `BR3` (1), `DC` (1), `DD` (1), `CB2` (1), `MVX` (1)
- `description`: distinct≈6 coverage=100% — top: `Orthodontics` (2), `BASIC REST, EXT, SSC` (1), `D2C D4355, D4910` (1), `D2C D9942-9946, D9972-9975` (1), `MISC BASIC,MJR,GEN,ADJ,EX=RO,RG` (1), `MAJOR SERVICES INC=RG EXC=CS,GD,PG` (1)
- `explanationcode`: distinct≈1 coverage=100% — top: `206 ` (7)

## Table `root__eligibility__wait__waitingperiods__treatments`
- Rows observed (for inference): 17
- Parent: `root__eligibility__wait__waitingperiods`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 17 | 0 | int:17 | 0|8 |  |
| `treatmentcode` | 17 | 0 | str:17 |  | 2 |
| `treatmentdescription` | 17 | 0 | str:17 |  | 28 |

**Domain candidates:**
- `ordinal`: distinct≈9 coverage=100% — top: `0` (4), `1` (3), `2` (3), `3` (2), `4` (1), `5` (1), `6` (1), `7` (1), `8` (1)
- `treatmentcode`: distinct≈9 coverage=100% — top: `RS` (3), `OS` (2), `PD` (2), `IS` (2), `OR` (2), `PF` (2), `PR` (2), `EN` (1), `GS` (1)
- `treatmentdescription`: distinct≈9 coverage=100% — top: `Restorative` (3), `Oral & Maxillofacial Surgery` (2), `Periodontics` (2), `Implant Services` (2), `Orthodontics` (2), `Prosthodontics; Fixed` (2), `Prosthodontics; Removable` (2), `Endodontics` (1), `Adjunctive General Services` (1)

## Table `root__eligibility__pkg__treatment__procedureclass__procedure`
- Rows observed (for inference): 6201
- Parent: `root__eligibility__pkg__treatment__procedureclass`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 6201 | 0 | int:6201 | 0|44 |  |
| `code` | 6201 | 0 | str:6201 |  | 5 |
| `description` | 6201 | 0 | str:6201 |  | 222 |
| `crosscheckprocedurecodes` | 4802 | 0 | str:4802 |  | 311 |
| `suppressionindicator` | 6201 | 0 | bool:6201 |  |  |
| `ivrsuppressionindicator` | 6201 | 0 | bool:6201 |  |  |
| `preapprovalrequired` | 6201 | 0 | bool:6201 |  |  |
| `incentiveprocedure` | 6201 | 0 | bool:6201 |  |  |
| `defaultnetwork` | 6201 | 0 | str:6201 |  | 5 |

**Domain candidates:**
- `ordinal`: distinct≈45 coverage=93% — top: `0` (952), `1` (823), `2` (661), `3` (511), `4` (362), `5` (323), `6` (298), `7` (265), `8` (246), `9` (210)
- `suppressionindicator`: distinct≈2 coverage=100% — top: `False` (6146), `True` (55)
- `ivrsuppressionindicator`: distinct≈2 coverage=100% — top: `True` (5509), `False` (692)
- `preapprovalrequired`: distinct≈1 coverage=100% — top: `False` (6201)
- `incentiveprocedure`: distinct≈1 coverage=100% — top: `False` (6201)
- `defaultnetwork`: distinct≈1 coverage=100% — top: `##PPO` (6201)

## Table `root__eligibility__maxded__maximumsinfo__servicesallowed__procedurecodesallowed`
- Rows observed (for inference): 5904
- Parent: `root__eligibility__maxded__maximumsinfo__servicesallowed`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 5904 | 0 | int:5904 | 0|67 |  |
| `code` | 5904 | 0 | str:5904 |  | 5 |
| `description` | 5904 | 0 | str:5904 |  | 222 |
| `suppressionindicator` | 5904 | 0 | bool:5904 |  |  |
| `ivrsuppressionindicator` | 5904 | 0 | bool:5904 |  |  |

**Domain candidates:**
- `suppressionindicator`: distinct≈2 coverage=100% — top: `False` (5849), `True` (55)
- `ivrsuppressionindicator`: distinct≈2 coverage=100% — top: `True` (5299), `False` (605)

## Table `root__eligibility__maxded__deductiblesinfo__servicesallowed__procedurecodesallowed`
- Rows observed (for inference): 9964
- Parent: `root__eligibility__maxded__deductiblesinfo__servicesallowed`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 9964 | 0 | int:9964 | 0|67 |  |
| `code` | 9964 | 0 | str:9964 |  | 5 |
| `description` | 9964 | 0 | str:9964 |  | 222 |
| `suppressionindicator` | 9964 | 0 | bool:9964 |  |  |
| `ivrsuppressionindicator` | 9964 | 0 | bool:9964 |  |  |

**Domain candidates:**
- `suppressionindicator`: distinct≈2 coverage=100% — top: `False` (9828), `True` (136)
- `ivrsuppressionindicator`: distinct≈2 coverage=100% — top: `True` (9060), `False` (904)

## Table `root__eligibility__hist__procedures__services__toothsurfaces`
- Rows observed (for inference): 73
- Parent: `root__eligibility__hist__procedures__services`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 73 | 0 | int:73 | 0|1 |  |
| `code` | 73 | 0 | str:73 |  | 1 |
| `description` | 73 | 0 | str:73 |  | 8 |

**Domain candidates:**
- `ordinal`: distinct≈2 coverage=100% — top: `0` (62), `1` (11)
- `code`: distinct≈5 coverage=100% — top: `O` (49), `B` (10), `F` (7), `L` (6), `M` (1)
- `description`: distinct≈5 coverage=100% — top: `Occlusal` (49), `Buccal` (10), `Facial` (7), `Lingual` (6), `Mesial` (1)

## Table `root__eligibility__persons__persons__enrollees__ids`
- Rows observed (for inference): 21
- Parent: `root__eligibility__persons__persons__enrollees`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 21 | 0 | int:21 | 0|4 |  |
| `value` | 21 | 0 | str:21 |  | 12 |

**Domain candidates:**
- `ordinal`: distinct≈5 coverage=100% — top: `0` (15), `1` (3), `2` (1), `3` (1), `4` (1)
- `value`: distinct≈21 coverage=95% — top: `113369873602` (1), `122766742002` (1), `116499457202` (1), `125385078603` (1), `123070391605` (1), `116668264902` (1), `113681051403` (1), `114665471803` (1), `002175461802` (1), `125385078605` (1)

## Table `root__eligibility__wait__waitingperiods__treatments__procedureclasses`
- Rows observed (for inference): 91
- Parent: `root__eligibility__wait__waitingperiods__treatments`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 91 | 0 | int:91 | 0|12 |  |
| `summarycategorycode` | 91 | 0 | str:91 |  | 2 |
| `summarycategorydescription` | 91 | 0 | str:91 |  | 28 |
| `classificationcode` | 91 | 0 | str:91 |  | 2 |
| `classificationdescription` | 91 | 0 | str:91 |  | 65 |

**Domain candidates:**
- `ordinal`: distinct≈13 coverage=100% — top: `0` (17), `1` (15), `2` (14), `3` (13), `4` (10), `5` (7), `6` (5), `7` (3), `8` (3), `9` (1)
- `summarycategorycode`: distinct≈11 coverage=100% — top: `P` (25), `OS` (14), `OR` (14), `EN` (9), `IS` (8), `MR` (6), `BR` (5), `RS` (4), `PD` (3), `GS` (2)
- `summarycategorydescription`: distinct≈11 coverage=100% — top: `Prosthodontics` (25), `Oral & Maxillofacial Surgery` (14), `Orthodontics` (14), `Endodontics` (9), `Implant Services` (8), `Major Restorative` (6), `Basic Restorative` (5), `Restorative` (4), `Periodontics` (3), `Adjunctive General Services` (2)

## Table `root__eligibility__pkg__treatment__procedureclass__procedure__network`
- Rows observed (for inference): 18603
- Parent: `root__eligibility__pkg__treatment__procedureclass__procedure`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 18603 | 0 | int:18603 | 0|2 |  |
| `code` | 18603 | 0 | str:18603 |  | 5 |
| `description` | 18603 | 0 | str:18603 |  | 28 |
| `incentivenetwork` | 18603 | 0 | bool:18603 |  |  |
| `agelimit` | 18603 | 0 | bool:18603 |  |  |
| `cmsnpnetworkexists` | 18603 | 0 | bool:18603 |  |  |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (6201), `1` (6201), `2` (6201)
- `code`: distinct≈3 coverage=100% — top: `##NP` (6201), `##PMR` (6201), `##PPO` (6201)
- `description`: distinct≈4 coverage=100% — top: `Non-Delta Dental Dentist` (6201), `Delta Dental Premier Dentist` (6201), `Delta Dental PPO Dentist` (4515), `Delta Dental DPO Dentist` (1686)
- `incentivenetwork`: distinct≈1 coverage=100% — top: `False` (18603)
- `agelimit`: distinct≈2 coverage=100% — top: `False` (14656), `True` (3947)
- `cmsnpnetworkexists`: distinct≈1 coverage=100% — top: `False` (18603)

## Table `root__eligibility__pkg__treatment__procedureclass__procedure__limitation`
- Rows observed (for inference): 6394
- Parent: `root__eligibility__pkg__treatment__procedureclass__procedure`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 6394 | 0 | int:6394 | 0|2 |  |
| `networksapplicable` | 6394 | 0 | str:6394 |  | 16 |
| `benefitquantity` | 6394 | 0 | int:6394 | 0|4 |  |
| `benefitcounteridentifier` | 5752 | 0 | str:5752 |  | 35 |
| `alllimitedtocounteridentifier` | 5752 | 0 | str:5752 |  | 43 |
| `frequencylimitationtext` | 6394 | 0 | str:6394 |  | 518 |
| `periodtypecode` | 4751 | 0 | str:4751 |  | 2 |
| `limitationsequencenumberforprogram` | 6394 | 0 | int:6394 | 1|1 |  |
| `limitationkeywordsequencenumber` | 6394 | 0 | int:6394 | 1|3 |  |
| `intervalunitcode` | 5925 | 0 | str:5925 |  | 6 |
| `intervalnumber` | 4751 | 0 | int:4751 | 1|120 |  |
| `limitedtokeywordidentifier` | 5752 | 0 | str:5752 |  | 43 |
| `frequencylimitationqualifiercode` | 5082 | 0 | str:5082 |  | 3 |
| `individualrelationshipcode` | 191 | 0 | str:191 |  | 4 |
| `individualrelationshipcodedescription` | 191 | 0 | str:191 |  | 21 |

**Domain candidates:**
- `ordinal`: distinct≈3 coverage=100% — top: `0` (6201), `1` (189), `2` (4)
- `networksapplicable`: distinct≈7 coverage=100% — top: `##NP,##PMR,##PPO` (6374), `##PMR` (9), `##NP,##PPO` (7), `##NP,##PMR` (1), `##PPO` (1), `##NP` (1), `##PMR,##PPO` (1)
- `benefitquantity`: distinct≈5 coverage=100% — top: `1` (5362), `0` (469), `2` (450), `4` (96), `3` (17)
- `periodtypecode`: distinct≈4 coverage=100% — top: `RO` (4361), `CA` (338), `DV` (32), `GR` (20)
- `limitationsequencenumberforprogram`: distinct≈1 coverage=100% — top: `1` (6394)
- `limitationkeywordsequencenumber`: distinct≈3 coverage=100% — top: `1` (6206), `2` (184), `3` (4)
- `intervalunitcode`: distinct≈4 coverage=100% — top: `Months` (4132), `Life` (1174), `Years` (390), `Days` (229)
- `intervalnumber`: distinct≈10 coverage=100% — top: `60` (2310), `24` (735), `1` (606), `36` (379), `12` (315), `6` (233), `84` (160), `30` (9), `90` (3), `120` (1)
- `frequencylimitationqualifiercode`: distinct≈15 coverage=100% — top: `T` (3065), `A` (779), `D` (454), `Q` (366), `X27` (128), `P` (94), `X22` (42), `X99` (42), `X23` (30), `TP` (29)
- `individualrelationshipcode`: distinct≈2 coverage=100% — top: `##DP` (181), `##SS` (10)
- `individualrelationshipcodedescription`: distinct≈2 coverage=100% — top: `Dependents Only` (181), `Subscriber and Spouse` (10)

## Table `root__eligibility__pkg__treatment__procedureclass__procedure__network__coveragedetail`
- Rows observed (for inference): 18916
- Parent: `root__eligibility__pkg__treatment__procedureclass__procedure__network`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 18916 | 0 | int:18916 | 0|1 |  |
| `benefitcoveragelevel` | 18916 | 0 | str:18916 |  | 6 |
| `copayamount` | 18916 | 0 | str:18916 |  | 4 |
| `amounttype` | 18916 | 0 | str:18916 |  | 7 |
| `sexagecodedescription` | 18916 | 0 | str:18916 |  | 36 |
| `minage` | 18916 | 0 | int:18916 | 0|19 |  |
| `maxage` | 18916 | 0 | int:18916 | 0|99 |  |
| `adult` | 18916 | 0 | bool:18916 |  |  |
| `maximumexempted` | 18916 | 0 | bool:18916 |  |  |
| `deductibleexempted` | 18916 | 0 | bool:18916 |  |  |
| `outofpocketmaximumapplies` | 18916 | 0 | bool:18916 |  |  |
| `sexagecode` | 4229 | 0 | str:4229 |  | 2 |
| `individualrelationshipcode` | 603 | 0 | str:603 |  | 4 |
| `individualrelationshipcodedescription` | 603 | 0 | str:603 |  | 21 |
| `grouptoothcode` | 11692 | 0 | str:11692 |  | 31 |
| `toothnumbercode` | 11692 | 0 | str:11692 |  | 195 |

**Domain candidates:**
- `ordinal`: distinct≈2 coverage=100% — top: `0` (18603), `1` (313)
- `benefitcoveragelevel`: distinct≈9 coverage=100% — top: `50.00` (8134), `80.00` (3800), `100.00` (3177), `60.00` (1835), `65.00` (597), `95.00` (531), `90.00` (487), `40.00` (331), `70.00` (24)
- `copayamount`: distinct≈1 coverage=100% — top: `0.00` (18916)
- `amounttype`: distinct≈1 coverage=100% — top: `PERCENT` (18916)
- `sexagecodedescription`: distinct≈13 coverage=100% — top: `No` (14687), `16 years and older` (2166), `12 years and older` (488), `Child up to and not including age 16` (408), `Child up to and not including age 19` (270), `Child up to and not including age 14` (261), `19 years and older` (201), `18 years and older` (120), `Child up to and not including age 18` (120), `Child up to and not including age 9` (78)
- `minage`: distinct≈5 coverage=100% — top: `0` (15941), `16` (2166), `12` (488), `19` (201), `18` (120)
- `maxage`: distinct≈10 coverage=100% — top: `0` (14687), `99` (2975), `16` (408), `19` (270), `14` (261), `18` (120), `9` (78), `26` (66), `3` (45), `15` (6)
- `adult`: distinct≈2 coverage=100% — top: `False` (18886), `True` (30)
- `maximumexempted`: distinct≈2 coverage=100% — top: `False` (17917), `True` (999)
- `deductibleexempted`: distinct≈2 coverage=100% — top: `False` (16395), `True` (2521)
- `outofpocketmaximumapplies`: distinct≈1 coverage=100% — top: `False` (18916)
- `sexagecode`: distinct≈12 coverage=100% — top: `32` (2166), `24` (488), `31` (408), `37` (270), `27` (261), `38` (201), `36` (120), `35` (120), `17` (78), `51` (66)
- `individualrelationshipcode`: distinct≈2 coverage=100% — top: `##DP` (573), `##SS` (30)
- `individualrelationshipcodedescription`: distinct≈2 coverage=100% — top: `Dependents Only` (573), `Subscriber and Spouse` (30)
- `grouptoothcode`: distinct≈33 coverage=96% — top: `##UA,##LA` (5391), `##UA1,##ANTPRMU,##LA1,##ANTPRML` (810), `##UR,##UL,##LL,##LR` (768), `##U1,##U2` (573), `##TA` (471), `LL,LR,UL,UR` (450), `##U8` (438), `##PT` (371), `##U9` (336), `##AU,##AL` (315)
- `toothnumbercode`: distinct≈23 coverage=99% — top: `01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32` (7340), `01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,A,AS,B,BS,C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,I,IS,J,JS,K,KS,L,LS,M,MS,N,NS,O,OS,P,PS,Q,QS,R,RS,S,SS,T,TS` (1044), `LL,LR,UL,UR` (855), `U,UP` (438), `L,LO,LW,U,UP` (336), `L,LO,LW` (336), `06,07,08,09,10,11,22,23,24,25,26,27,C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,M,MS,N,NS,O,OS,P,PS,Q,QS,R,RS` (315), `04,05,12,13,20,21,28,29` (135), `01,02,03,04,05,12,13,14,15,16,17,18,19,20,21,28,29,30,31,32,A,AS,B,BS,I,IS,J,JS,K,KS,L,LS,S,SS,T,TS` (120), `C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,M,MS,N,NS,O,OS,P,PS,Q,R,RS` (117)

## Table `root__eligibility__pkg__treatment__procedureclass__procedure__limitation__sexagetoothcode`
- Rows observed (for inference): 6436
- Parent: `root__eligibility__pkg__treatment__procedureclass__procedure__limitation`
- Origin: array elements (has `ordinal`)

| Column | non-null | nulls | types | min|max (int/float) | max str len |
|---|---:|---:|---|---|---:|
| `ordinal` | 6436 | 0 | int:6436 | 0|1 |  |
| `sexagecodedescription` | 6436 | 0 | str:6436 |  | 36 |
| `minage` | 6436 | 0 | int:6436 | 0|19 |  |
| `maxage` | 6436 | 0 | int:6436 | 0|99 |  |
| `toothlimitation` | 6436 | 0 | bool:6436 |  |  |
| `sexagecode` | 1424 | 0 | str:1424 |  | 2 |
| `grouptoothcode` | 3919 | 0 | str:3919 |  | 31 |
| `toothnumbercode` | 3919 | 0 | str:3919 |  | 195 |

**Domain candidates:**
- `ordinal`: distinct≈2 coverage=100% — top: `0` (6394), `1` (42)
- `sexagecodedescription`: distinct≈13 coverage=100% — top: `No` (5012), `16 years and older` (722), `12 years and older` (164), `Child up to and not including age 16` (137), `Child up to and not including age 19` (93), `Child up to and not including age 14` (87), `19 years and older` (68), `18 years and older` (41), `Child up to and not including age 18` (40), `Child up to and not including age 9` (26)
- `minage`: distinct≈5 coverage=100% — top: `0` (5441), `16` (722), `12` (164), `19` (68), `18` (41)
- `maxage`: distinct≈10 coverage=100% — top: `0` (5012), `99` (995), `16` (137), `19` (93), `14` (87), `18` (40), `9` (26), `3` (22), `26` (22), `15` (2)
- `toothlimitation`: distinct≈2 coverage=100% — top: `True` (3919), `False` (2517)
- `sexagecode`: distinct≈12 coverage=100% — top: `32` (722), `24` (164), `31` (137), `37` (93), `27` (87), `38` (68), `36` (41), `35` (40), `17` (26), `05` (22)
- `grouptoothcode`: distinct≈33 coverage=96% — top: `##LA,##UA` (1811), `##ANTPRML,##ANTPRMU,##LA1,##UA1` (270), `##LL,##LR,##UL,##UR` (256), `##U1,##U2` (191), `##TA` (159), `LL,LR,UL,UR` (150), `##U8` (146), `##PT` (123), `##U9` (112), `##AL,##AU` (105)
- `toothnumbercode`: distinct≈22 coverage=99% — top: `01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32` (2461), `01,02,03,04,05,06,07,08,09,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,A,AS,B,BS,C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,I,IS,J,JS,K,KS,L,LS,M,MS,N,NS,O,OS,P,PS,Q,QS,R,RS,S,SS,T,TS` (350), `LL,LR,UL,UR` (285), `U,UP` (146), `L,LO,LW,U,UP` (112), `L,LO,LW` (112), `06,07,08,09,10,11,22,23,24,25,26,27,C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,M,MS,N,NS,O,OS,P,PS,Q,QS,R,RS` (105), `04,05,12,13,20,21,28,29` (45), `01,02,03,04,05,12,13,14,15,16,17,18,19,20,21,28,29,30,31,32,A,AS,B,BS,I,IS,J,JS,K,KS,L,LS,S,SS,T,TS` (40), `C,CS,D,DS,E,ES,F,FS,G,GS,H,HS,M,MS,N,NS,O,OS,P,PS,Q,R,RS` (39)
