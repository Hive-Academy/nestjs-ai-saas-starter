```bash
src/lib/examples/03-query-builder/06-production-queries.example.ts(10,29): error TS6133: 'createQueryBuilder' is declared but its value is never read.
src/lib/examples/03-query-builder/06-production-queries.example.ts(10,55): error TS2307: Cannot find module '../../query-builder/neo4j-query-builder' or its corresponding type declarations.
src/lib/examples/03-query-builder/06-production-queries.example.ts(11,1): error TS6133: 'Neo4jEntity' is declared but its value is never read.
src/lib/examples/03-query-builder/06-production-queries.example.ts(12,1): error TS6133: 'Neo4jCompatibleEntity' is declared but its value is never read.
src/lib/examples/03-query-builder/06-production-queries.example.ts(15,1): error TS6133: 'Post' is declared but its value is never read.
src/lib/examples/03-query-builder/06-production-queries.example.ts(165,27): error TS2304: Cannot find name 'Organization'.
src/lib/examples/03-query-builder/06-production-queries.example.ts(276,27): error TS2304: Cannot find name 'Organization'.
src/lib/examples/03-query-builder/06-production-queries.example.ts(392,27): error TS2304: Cannot find name 'Organization'.
src/lib/examples/03-query-builder/06-production-queries.example.ts(486,31): error TS2304: Cannot find name 'Product'.
src/lib/examples/03-query-builder/06-production-queries.example.ts(825,27): error TS2304: Cannot find name 'Organization'.
src/lib/examples/03-query-builder/06-production-queries.example.ts(952,22): error TS6138: Property 'queryBuilder' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(24,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(25,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jQueryBuilder'. Did you mean 'NeogmaQueryBuilder'?
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(28,15): error TS6196: 'User' is declared but never used.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(28,30): error TS6196: 'Order' is declared but never used.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(28,37): error TS6196: 'Category' is declared but never used.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(28,47): error TS6196: 'Review' is declared but never used.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(28,61): error TS2307: Cannot find module '../02-entities-and-relationships/types' or its corresponding type declarations.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(35,14): error TS2323: Cannot redeclare exported variable 'AdvancedProductService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(39,37): error TS6138: Property 'neo4j' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(62,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(105,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(179,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(288,25): error TS1361: 'Product' cannot be used as a value because it was imported using 'import type'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(370,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(408,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(526,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(584,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(659,14): error TS2323: Cannot redeclare exported variable 'AdvancedUserAnalyticsService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(663,37): error TS6138: Property 'neo4j' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(693,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(805,14): error TS2323: Cannot redeclare exported variable 'ProductionMonitoringService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(807,37): error TS6138: Property 'neo4j' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(820,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(867,3): error TS2323: Cannot redeclare exported variable 'AdvancedProductService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(867,3): error TS2484: Export declaration conflicts with exported declaration of 'AdvancedProductService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(868,3): error TS2323: Cannot redeclare exported variable 'AdvancedUserAnalyticsService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(868,3): error TS2484: Export declaration conflicts with exported declaration of 'AdvancedUserAnalyticsService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(869,3): error TS2323: Cannot redeclare exported variable 'ProductionMonitoringService'.
src/lib/examples/04-advanced-decorators/01-cypher-query-advanced.example.ts(869,3): error TS2484: Export declaration conflicts with exported declaration of 'ProductionMonitoringService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(23,3): error TS6133: 'CypherQuery' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(26,8): error TS6133: 'QueryResult' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(28,1): error TS6192: All imports in import declaration are unused.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(28,75): error TS2307: Cannot find module '../02-entities-and-relationships/types' or its corresponding type declarations.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(35,14): error TS2323: Cannot redeclare exported variable 'TransactionalECommerceService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(173,53): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(173,70): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(190,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(239,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(287,42): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(288,42): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(290,17): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(291,14): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(295,37): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(301,43): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(318,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(424,71): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(424,88): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(434,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(442,24): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ BRONZE: string[]; SILVER: string[]; GOLD: string[]; PLATINUM: string[]; }'.
  No index signature with a parameter of type 'string' was found on type '{ BRONZE: string[]; SILVER: string[]; GOLD: string[]; PLATINUM: string[]; }'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(545,51): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(545,68): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(562,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(624,20): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(746,55): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(746,72): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(758,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(893,14): error TS2323: Cannot redeclare exported variable 'MultiTenantTransactionalService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(897,37): error TS6138: Property 'neo4j' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(945,58): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(945,75): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(968,3): error TS2323: Cannot redeclare exported variable 'TransactionalECommerceService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(968,3): error TS2484: Export declaration conflicts with exported declaration of 'TransactionalECommerceService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(969,3): error TS2323: Cannot redeclare exported variable 'MultiTenantTransactionalService'.
src/lib/examples/04-advanced-decorators/02-transactional.example.ts(969,3): error TS2484: Export declaration conflicts with exported declaration of 'MultiTenantTransactionalService'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(23,3): error TS6133: 'CypherQuery' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(26,8): error TS6133: 'SafeConfig' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(28,3): error TS6133: 'SafeValidationError' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(30,1): error TS6192: All imports in import declaration are unused.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(30,70): error TS2307: Cannot find module '../02-entities-and-relationships/types' or its corresponding type declarations.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(37,14): error TS2323: Cannot redeclare exported variable 'SafeContentManagementService'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(146,13): error TS7034: Variable 'validationWarnings' implicitly has type 'any[]' in some locations where its type cannot be determined.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(160,38): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(209,11): error TS7005: Variable 'validationWarnings' implicitly has an 'any[]' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(217,11): error TS7005: Variable 'validationWarnings' implicitly has an 'any[]' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(223,55): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(223,72): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(308,66): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ displayName?: string | undefined; email?: string | undefined; phone?: string | undefined; bio?: string | undefined; location?: { city: string; country: string; timezone: string; } | undefined; preferences?: { ...; } | undefined; socialLinks?: { ...; } | undefined; }'.
  No index signature with a parameter of type 'string' was found on type '{ displayName?: string | undefined; email?: string | undefined; phone?: string | undefined; bio?: string | undefined; location?: { city: string; country: string; timezone: string; } | undefined; preferences?: { ...; } | undefined; socialLinks?: { ...; } | undefined; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(317,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(318,13): error TS6133: 'result' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(424,11): error TS7034: Variable 'securityFlags' implicitly has type 'any[]' in some locations where its type cannot be determined.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(438,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(479,11): error TS7005: Variable 'securityFlags' implicitly has an 'any[]' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(571,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(725,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(842,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(844,13): error TS6133: 'result' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(918,11): error TS7034: Variable 'invalid' implicitly has type 'any[]' in some locations where its type cannot be determined.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(930,15): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
  No index signature with a parameter of type 'string' was found on type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(930,44): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
  No index signature with a parameter of type 'string' was found on type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(931,18): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
  No index signature with a parameter of type 'string' was found on type '{ twitter: string[]; linkedin: string[]; website: never[]; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(931,49): error TS7006: Parameter 'domain' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(941,43): error TS7005: Variable 'invalid' implicitly has an 'any[]' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(989,12): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ 'image/jpeg': string[]; 'image/png': string[]; 'image/gif': string[]; 'image/webp': string[]; 'application/pdf': string[]; 'text/plain': string[]; 'text/csv': string[]; }'.
  No index signature with a parameter of type 'string' was found on type '{ 'image/jpeg': string[]; 'image/png': string[]; 'image/gif': string[]; 'image/webp': string[]; 'application/pdf': string[]; 'text/plain': string[]; 'text/csv': string[]; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(1000,40): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ AVATAR: number; DOCUMENT: number; ATTACHMENT: number; CONTENT: number; }'.
  No index signature with a parameter of type 'string' was found on type '{ AVATAR: number; DOCUMENT: number; ATTACHMENT: number; CONTENT: number; }'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(1028,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(1069,10): error TS2323: Cannot redeclare exported variable 'SafeContentManagementService'.
src/lib/examples/04-advanced-decorators/03-safe-decorator.example.ts(1069,10): error TS2484: Export declaration conflicts with exported declaration of 'SafeContentManagementService'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(27,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(28,8): error TS2724: '"../../../index"' has no exported member named 'FindAllOptions'. Did you mean 'FindOptions'?
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(28,8): error TS6133: 'FindAllOptions' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(31,30): error TS6196: 'Order' is declared but never used.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(31,37): error TS6196: 'Review' is declared but never used.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(31,45): error TS6196: 'Category' is declared but never used.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(31,55): error TS6196: 'Brand' is declared but never used.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(31,68): error TS2307: Cannot find module '../02-entities-and-relationships/types' or its corresponding type declarations.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(37,19): error TS1361: 'Product' cannot be used as a value because it was imported using 'import type'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(38,14): error TS2323: Cannot redeclare exported variable 'BasicProductRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(62,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(79,33): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(99,35): error TS2339: Property 'findAll' does not exist on type 'BasicProductRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(103,42): error TS7006: Parameter 'p' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(109,42): error TS7006: Parameter 'p' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(121,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(141,33): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(151,21): error TS1361: 'User' cannot be used as a value because it was imported using 'import type'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(161,14): error TS2323: Cannot redeclare exported variable 'AdvancedUserRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(183,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(249,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(326,37): error TS2339: Property 'findById' does not exist on type 'AdvancedUserRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(333,11): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ name?: string | undefined; email?: string | undefined; profile?: Record<string, any> | undefined; preferences?: Record<string, any> | undefined; }'.
  No index signature with a parameter of type 'string' was found on type '{ name?: string | undefined; email?: string | undefined; profile?: Record<string, any> | undefined; preferences?: Record<string, any> | undefined; }'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(338,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(394,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(431,33): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(467,36): error TS2339: Property 'update' does not exist on type 'AdvancedUserRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(481,18): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(490,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(506,15): error TS2322: Type '() => ObjectConstructor' is not assignable to type '() => new () => NeogmaEntity'.
  Call signature return types 'ObjectConstructor' and 'new () => NeogmaEntity' are incompatible.
    The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?
      Property 'id' is missing in type 'Object' but required in type 'NeogmaEntity'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(513,14): error TS2323: Cannot redeclare exported variable 'ContentRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(514,20): error TS6133: 'logger' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(537,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(602,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(654,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(701,15): error TS2322: Type '() => ObjectConstructor' is not assignable to type '() => new () => NeogmaEntity'.
  Call signature return types 'ObjectConstructor' and 'new () => NeogmaEntity' are incompatible.
    The 'Object' type is assignable to very few other types. Did you mean to use the 'any' type instead?
      Property 'id' is missing in type 'Object' but required in type 'NeogmaEntity'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(710,14): error TS2323: Cannot redeclare exported variable 'AnalyticsRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(711,20): error TS6133: 'logger' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(714,37): error TS6138: Property 'neo4j' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(726,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(784,7): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'QueryResult'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(840,14): error TS2323: Cannot redeclare exported variable 'MultiTenantRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(841,20): error TS6133: 'logger' is declared but its value is never read.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(859,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(886,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(892,11): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ tenantId: string; }'.
  No index signature with a parameter of type 'string' was found on type '{ tenantId: string; }'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(905,33): error TS7006: Parameter 'record' implicitly has an 'any' type.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(912,3): error TS2323: Cannot redeclare exported variable 'BasicProductRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(912,3): error TS2484: Export declaration conflicts with exported declaration of 'BasicProductRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(913,3): error TS2323: Cannot redeclare exported variable 'AdvancedUserRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(913,3): error TS2484: Export declaration conflicts with exported declaration of 'AdvancedUserRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(914,3): error TS2323: Cannot redeclare exported variable 'ContentRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(914,3): error TS2484: Export declaration conflicts with exported declaration of 'ContentRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(915,3): error TS2323: Cannot redeclare exported variable 'AnalyticsRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(915,3): error TS2484: Export declaration conflicts with exported declaration of 'AnalyticsRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(916,3): error TS2323: Cannot redeclare exported variable 'MultiTenantRepository'.
src/lib/examples/04-advanced-decorators/04-repository-decorators.example.ts(916,3): error TS2484: Export declaration conflicts with exported declaration of 'MultiTenantRepository'.
src/lib/examples/05-security-system/01-authorization.example.ts(18,21): error TS6133: 'AuthorizeConfig' is declared but its value is never read.
src/lib/examples/05-security-system/01-authorization.example.ts(20,10): error TS2305: Module '"../../decorators/index"' has no exported member 'Repository'.
src/lib/examples/05-security-system/01-authorization.example.ts(21,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/01-authorization.example.ts(58,19): error TS2693: 'EnterpriseUser' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(59,14): error TS2323: Cannot redeclare exported variable 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(71,17): error TS2339: Property 'findAll' does not exist on type 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(83,17): error TS2339: Property 'findAll' does not exist on type 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(94,17): error TS2339: Property 'findById' does not exist on type 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(104,19): error TS2693: 'EnterpriseUser' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(105,14): error TS2323: Cannot redeclare exported variable 'TenantIsolationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(123,17): error TS2339: Property 'findAll' does not exist on type 'TenantIsolationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(139,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(165,17): error TS2339: Property 'findAll' does not exist on type 'TenantIsolationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(175,19): error TS2693: 'FinancialDocument' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(176,14): error TS2323: Cannot redeclare exported variable 'ResourceBasedAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(199,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(233,31): error TS2339: Property 'update' does not exist on type 'ResourceBasedAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(257,17): error TS2339: Property 'delete' does not exist on type 'ResourceBasedAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(267,19): error TS2693: 'FinancialDocument' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(268,14): error TS2323: Cannot redeclare exported variable 'CustomAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(292,17): error TS2339: Property 'findAll' does not exist on type 'CustomAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(319,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(350,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(372,19): error TS2693: 'FinancialDocument' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(373,14): error TS2323: Cannot redeclare exported variable 'MultiLayerAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(421,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(463,37): error TS2532: Object is possibly 'undefined'.
src/lib/examples/05-security-system/01-authorization.example.ts(471,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(491,17): error TS6133: 'checkEmergencyStatus' is declared but its value is never read.
src/lib/examples/05-security-system/01-authorization.example.ts(503,19): error TS2693: 'EnterpriseUser' only refers to a type, but is being used as a value here.
src/lib/examples/05-security-system/01-authorization.example.ts(504,14): error TS2323: Cannot redeclare exported variable 'HierarchicalAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(533,17): error TS2339: Property 'findAll' does not exist on type 'HierarchicalAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(559,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,10): error TS2323: Cannot redeclare exported variable 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,10): error TS2484: Export declaration conflicts with exported declaration of 'BasicRoleAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,41): error TS2323: Cannot redeclare exported variable 'TenantIsolationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,41): error TS2484: Export declaration conflicts with exported declaration of 'TenantIsolationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,65): error TS2323: Cannot redeclare exported variable 'ResourceBasedAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,65): error TS2484: Export declaration conflicts with exported declaration of 'ResourceBasedAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,100): error TS2323: Cannot redeclare exported variable 'CustomAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,100): error TS2484: Export declaration conflicts with exported declaration of 'CustomAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,128): error TS2323: Cannot redeclare exported variable 'MultiLayerAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,128): error TS2484: Export declaration conflicts with exported declaration of 'MultiLayerAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,160): error TS2323: Cannot redeclare exported variable 'HierarchicalAuthorizationService'.
src/lib/examples/05-security-system/01-authorization.example.ts(599,160): error TS2484: Export declaration conflicts with exported declaration of 'HierarchicalAuthorizationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(18,25): error TS6133: 'ValidateInputConfig' is declared but its value is never read.
src/lib/examples/05-security-system/02-input-validation.example.ts(20,10): error TS2305: Module '"../../decorators/index"' has no exported member 'Repository'.
src/lib/examples/05-security-system/02-input-validation.example.ts(21,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/02-input-validation.example.ts(81,14): error TS2323: Cannot redeclare exported variable 'BasicValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(163,17): error TS2339: Property 'create' does not exist on type 'BasicValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(226,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/02-input-validation.example.ts(257,14): error TS2323: Cannot redeclare exported variable 'CypherInjectionPreventionService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(373,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/02-input-validation.example.ts(437,31): error TS2339: Property 'update' does not exist on type 'CypherInjectionPreventionService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(455,14): error TS2323: Cannot redeclare exported variable 'BusinessValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(600,17): error TS2339: Property 'create' does not exist on type 'BusinessValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(654,36): error TS6133: 'departmentId' is declared but its value is never read.
src/lib/examples/05-security-system/02-input-validation.example.ts(699,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/02-input-validation.example.ts(729,14): error TS2323: Cannot redeclare exported variable 'FileUploadValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(867,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,10): error TS2323: Cannot redeclare exported variable 'BasicValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,10): error TS2484: Export declaration conflicts with exported declaration of 'BasicValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,34): error TS2323: Cannot redeclare exported variable 'CypherInjectionPreventionService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,34): error TS2484: Export declaration conflicts with exported declaration of 'CypherInjectionPreventionService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,68): error TS2323: Cannot redeclare exported variable 'BusinessValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,68): error TS2484: Export declaration conflicts with exported declaration of 'BusinessValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,95): error TS2323: Cannot redeclare exported variable 'FileUploadValidationService'.
src/lib/examples/05-security-system/02-input-validation.example.ts(914,95): error TS2484: Export declaration conflicts with exported declaration of 'FileUploadValidationService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(18,20): error TS6133: 'AuditLogConfig' is declared but its value is never read.
src/lib/examples/05-security-system/03-audit-logging.example.ts(20,58): error TS2307: Cannot find module '../../decorators/entity-crud.decorators' or its corresponding type declarations.
src/lib/examples/05-security-system/03-audit-logging.example.ts(21,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(77,14): error TS2323: Cannot redeclare exported variable 'MinimalAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(94,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(122,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(142,14): error TS2323: Cannot redeclare exported variable 'StandardAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(201,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(254,14): error TS2323: Cannot redeclare exported variable 'DetailedComplianceAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(280,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(411,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(446,14): error TS2323: Cannot redeclare exported variable 'ForensicAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(472,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(525,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(609,14): error TS2323: Cannot redeclare exported variable 'PerformanceOptimizedAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(627,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(656,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(691,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(713,14): error TS2323: Cannot redeclare exported variable 'CustomAuditFieldsService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(758,11): error TS6133: 'customAuditContext' is declared but its value is never read.
src/lib/examples/05-security-system/03-audit-logging.example.ts(795,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(819,11): error TS6133: 'auditMetadata' is declared but its value is never read.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,10): error TS2323: Cannot redeclare exported variable 'MinimalAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,10): error TS2484: Export declaration conflicts with exported declaration of 'MinimalAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,31): error TS2323: Cannot redeclare exported variable 'StandardAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,31): error TS2484: Export declaration conflicts with exported declaration of 'StandardAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,53): error TS2323: Cannot redeclare exported variable 'DetailedComplianceAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,53): error TS2484: Export declaration conflicts with exported declaration of 'DetailedComplianceAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,85): error TS2323: Cannot redeclare exported variable 'ForensicAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,85): error TS2484: Export declaration conflicts with exported declaration of 'ForensicAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,107): error TS2323: Cannot redeclare exported variable 'PerformanceOptimizedAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,107): error TS2484: Export declaration conflicts with exported declaration of 'PerformanceOptimizedAuditService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,141): error TS2323: Cannot redeclare exported variable 'CustomAuditFieldsService'.
src/lib/examples/05-security-system/03-audit-logging.example.ts(857,141): error TS2484: Export declaration conflicts with exported declaration of 'CustomAuditFieldsService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(18,21): error TS6133: 'RateLimitConfig' is declared but its value is never read.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(20,40): error TS2307: Cannot find module '../../decorators/entity-crud.decorators' or its corresponding type declarations.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(21,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(50,14): error TS2323: Cannot redeclare exported variable 'BasicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(71,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(137,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(159,14): error TS2323: Cannot redeclare exported variable 'SlidingWindowRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(181,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(259,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(283,14): error TS2323: Cannot redeclare exported variable 'TokenBucketRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(305,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(338,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(382,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(412,14): error TS2323: Cannot redeclare exported variable 'DynamicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(441,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(482,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(508,11): error TS6133: 'complexity' is declared but its value is never read.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(534,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(566,14): error TS2323: Cannot redeclare exported variable 'GeographicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(581,24): error TS2532: Object is possibly 'undefined'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(593,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(635,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(654,11): error TS6133: 'getRegionFromIP' is declared but its value is never read.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(680,14): error TS2323: Cannot redeclare exported variable 'EnterpriseMonitoringRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(706,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(750,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(786,28): error TS2532: Object is possibly 'undefined'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(798,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,10): error TS2323: Cannot redeclare exported variable 'BasicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,10): error TS2484: Export declaration conflicts with exported declaration of 'BasicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,36): error TS2323: Cannot redeclare exported variable 'SlidingWindowRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,36): error TS2484: Export declaration conflicts with exported declaration of 'SlidingWindowRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,70): error TS2323: Cannot redeclare exported variable 'TokenBucketRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,70): error TS2484: Export declaration conflicts with exported declaration of 'TokenBucketRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,102): error TS2323: Cannot redeclare exported variable 'DynamicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,102): error TS2484: Export declaration conflicts with exported declaration of 'DynamicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,130): error TS2323: Cannot redeclare exported variable 'GeographicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,130): error TS2484: Export declaration conflicts with exported declaration of 'GeographicRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,161): error TS2323: Cannot redeclare exported variable 'EnterpriseMonitoringRateLimitingService'.
src/lib/examples/05-security-system/04-rate-limiting.example.ts(857,161): error TS2484: Export declaration conflicts with exported declaration of 'EnterpriseMonitoringRateLimitingService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(18,28): error TS6133: 'EncryptSensitiveConfig' is declared but its value is never read.
src/lib/examples/05-security-system/05-data-encryption.example.ts(20,53): error TS2307: Cannot find module '../../decorators/entity-crud.decorators' or its corresponding type declarations.
src/lib/examples/05-security-system/05-data-encryption.example.ts(21,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(90,14): error TS2323: Cannot redeclare exported variable 'PCIComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(139,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(202,14): error TS2323: Cannot redeclare exported variable 'HIPAAComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(284,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(321,14): error TS2323: Cannot redeclare exported variable 'GDPRComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(404,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(450,14): error TS2323: Cannot redeclare exported variable 'FinancialAccountEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(503,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(537,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(590,14): error TS2323: Cannot redeclare exported variable 'PerformanceOptimizedEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(604,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(664,11): error TS6133: 'encryptionConfig' is declared but its value is never read.
src/lib/examples/05-security-system/05-data-encryption.example.ts(679,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(727,14): error TS2323: Cannot redeclare exported variable 'KeyManagementEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(779,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(819,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,10): error TS2323: Cannot redeclare exported variable 'PCIComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,10): error TS2484: Export declaration conflicts with exported declaration of 'PCIComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,42): error TS2323: Cannot redeclare exported variable 'HIPAAComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,42): error TS2484: Export declaration conflicts with exported declaration of 'HIPAAComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,76): error TS2323: Cannot redeclare exported variable 'GDPRComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,76): error TS2484: Export declaration conflicts with exported declaration of 'GDPRComplianceEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,109): error TS2323: Cannot redeclare exported variable 'FinancialAccountEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,109): error TS2484: Export declaration conflicts with exported declaration of 'FinancialAccountEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,144): error TS2323: Cannot redeclare exported variable 'PerformanceOptimizedEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,144): error TS2484: Export declaration conflicts with exported declaration of 'PerformanceOptimizedEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,183): error TS2323: Cannot redeclare exported variable 'KeyManagementEncryptionService'.
src/lib/examples/05-security-system/05-data-encryption.example.ts(884,183): error TS2484: Export declaration conflicts with exported declaration of 'KeyManagementEncryptionService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(24,3): error TS6133: 'AuthorizeConfig' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(25,3): error TS6133: 'ValidateInputConfig' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(26,3): error TS6133: 'AuditLogConfig' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(27,3): error TS6133: 'RateLimitConfig' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(28,3): error TS6133: 'EncryptSensitiveConfig' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(31,24): error TS6133: 'UpdateEntity' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(31,38): error TS6133: 'DeleteEntity' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(31,68): error TS2307: Cannot find module '../../decorators/entity-crud.decorators' or its corresponding type declarations.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(32,15): error TS2305: Module '"../../types/neo4j-types"' has no exported member 'BaseEntity'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(95,14): error TS2323: Cannot redeclare exported variable 'UltraSecureFinancialService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(345,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(382,14): error TS2323: Cannot redeclare exported variable 'HIPAACompliantPatientCareService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(408,13): error TS6133: 'patientId' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(409,13): error TS6133: 'physicianId' is declared but its value is never read.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(596,14): error TS2323: Cannot redeclare exported variable 'EnterpriseUserManagementService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(787,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(818,14): error TS2323: Cannot redeclare exported variable 'ComplianceDashboardService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(868,5): error TS2353: Object literal may only specify known properties, and 'query' does not exist in type 'CypherQueryConfig'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,10): error TS2323: Cannot redeclare exported variable 'UltraSecureFinancialService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,10): error TS2484: Export declaration conflicts with exported declaration of 'UltraSecureFinancialService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,39): error TS2323: Cannot redeclare exported variable 'HIPAACompliantPatientCareService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,39): error TS2484: Export declaration conflicts with exported declaration of 'HIPAACompliantPatientCareService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,73): error TS2323: Cannot redeclare exported variable 'EnterpriseUserManagementService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,73): error TS2484: Export declaration conflicts with exported declaration of 'EnterpriseUserManagementService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,106): error TS2323: Cannot redeclare exported variable 'ComplianceDashboardService'.
src/lib/examples/05-security-system/06-enterprise-security.example.ts(932,106): error TS2484: Export declaration conflicts with exported declaration of 'ComplianceDashboardService'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(9,8): error TS6133: 'GraphTraversalOptions' is declared but its value is never read.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(10,8): error TS2305: Module '"../../../index"' has no exported member 'ShortestPathOptions'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(10,8): error TS6133: 'ShortestPathOptions' is declared but its value is never read.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(11,8): error TS2305: Module '"../../../index"' has no exported member 'BaseEntity'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(14,15): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(54,60): error TS2344: Type 'Person' does not satisfy the constraint 'Neo4jCompatibleEntity'.
  Types of property 'createdAt' are incompatible.
    Type 'string' is not assignable to type 'Date'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(55,22): error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'GraphRepository<Person>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(58,25): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NeogmaModel<Neo4jSupportedProperties>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(76,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(93,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(101,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(109,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(132,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(158,7): error TS2353: Object literal may only specify known properties, and 'maxLength' does not exist in type 'GraphTraversalOptions'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(172,22): error TS2339: Property 'node' does not exist on type 'Person'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(173,32): error TS2339: Property 'relationship' does not exist on type 'Person'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(193,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(218,21): error TS2353: Object literal may only specify known properties, and 'isActive' does not exist in type 'Where'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(303,61): error TS2344: Type 'Company' does not satisfy the constraint 'Neo4jCompatibleEntity'.
  Types of property 'createdAt' are incompatible.
    Type 'string' is not assignable to type 'Date'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(304,22): error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'GraphRepository<Company>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(307,25): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NeogmaModel<Neo4jSupportedProperties>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(418,11): error TS6133: 'clientCount' is declared but its value is never read.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(434,61): error TS2344: Type 'Project' does not satisfy the constraint 'Neo4jCompatibleEntity'.
  Types of property 'createdAt' are incompatible.
    Type 'string' is not assignable to type 'Date'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(435,22): error TS4114: This member must have an 'override' modifier because it overrides a member in the base class 'GraphRepository<Project>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(438,25): error TS2345: Argument of type 'string' is not assignable to parameter of type 'NeogmaModel<Neo4jSupportedProperties>'.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(578,22): error TS6138: Property 'companyGraphRepo' is declared but its value is never read.
src/lib/examples/06-repositories/01-graph-repository-basics.example.ts(579,22): error TS6138: Property 'projectGraphRepo' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(19,3): error TS2724: '"../../../index"' has no exported member named 'MultiTenantConfigurations'. Did you mean 'MultiTenantDecorators'?
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(20,3): error TS2305: Module '"../../../index"' has no exported member 'MultiTenantModuleOptions'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(21,3): error TS2305: Module '"../../../index"' has no exported member 'TenantResolutionStrategy'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(22,3): error TS2305: Module '"../../../index"' has no exported member 'TenantConfigProvider'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(23,3): error TS2305: Module '"../../../index"' has no exported member 'DefaultTenantStrategies'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(24,3): error TS2305: Module '"../../../index"' has no exported member 'InMemoryTenantConfigProvider'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(24,3): error TS6133: 'InMemoryTenantConfigProvider' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'DatabaseTenantConfigProvider'.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(25,3): error TS6133: 'DatabaseTenantConfigProvider' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/01-module-setup.example.ts(26,3): error TS2305: Module '"../../../index"' has no exported member 'TenantConfig'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(15,46): error TS6133: 'Post' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(15,52): error TS6133: 'Body' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(15,58): error TS6133: 'Param' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(19,3): error TS2305: Module '"../../../index"' has no exported member 'TenantConfig'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(20,3): error TS2305: Module '"../../../index"' has no exported member 'TenantResolutionStrategy'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(21,3): error TS2305: Module '"../../../index"' has no exported member 'DefaultTenantStrategies'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(21,3): error TS6133: 'DefaultTenantStrategies' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(211,43): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(212,27): error TS7053: Element implicitly has an 'any' type because expression of type '"tenantContext"' can't be used to index type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
  Property 'tenantContext' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(358,12): error TS6133: 'universityId' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(358,26): error TS6133: 'schoolId' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(358,36): error TS6133: 'departmentId' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(358,50): error TS6133: 'courseId' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(521,63): error TS2345: Argument of type 'string | number | symbol' is not assignable to parameter of type '"maxNodes" | "maxRelationships" | "maxQueries"'.
  Type 'string' is not assignable to type '"maxNodes" | "maxRelationships" | "maxQueries"'.
src/lib/examples/07-multi-tenancy/02-tenant-context.example.ts(523,54): error TS2731: Implicit conversion of a 'symbol' to a 'string' will fail at runtime. Consider wrapping this expression in 'String(...)'.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(19,3): error TS2724: '"../../../index"' has no exported member named 'MultiTenantQueryOptions'. Did you mean 'MultiTenantQuery'?
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(19,3): error TS6133: 'MultiTenantQueryOptions' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(20,3): error TS2724: '"../../../index"' has no exported member named 'MultiTenantQueryResult'. Did you mean 'MultiTenantQuery'?
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(20,3): error TS6133: 'MultiTenantQueryResult' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(435,56): error TS7006: Parameter 'child' implicitly has an 'any' type.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(439,37): error TS7006: Parameter 'grandchild' implicitly has an 'any' type.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(685,5): error TS2740: Type 'QueryResult<RecordShape>' is missing the following properties from type 'TenantProject': id, tenantId, organizationId, name, and 8 more.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(772,22): error TS6138: Property 'organizationService' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(773,22): error TS6138: Property 'projectService' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/03-tenant-services.example.ts(973,11): error TS6133: 'analyticsResult' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(15,45): error TS6133: 'Put' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(15,50): error TS6133: 'Delete' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(15,78): error TS6133: 'UseGuards' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(24,3): error TS6133: 'TenantIsolationConfig' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(29,3): error TS6133: 'CypherQuery' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(34,3): error TS2305: Module '"../../../index"' has no exported member 'Cache'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(35,3): error TS2305: Module '"../../../index"' has no exported member 'Transform'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(133,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(153,5): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(186,7): error TS2353: Object literal may only specify known properties, and 'email' does not exist in type '{ parameterSchema?: Record<string, any> | undefined; validatePropertyTypes?: boolean | undefined; }'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(196,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(258,7): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ parameterSchema?: Record<string, any> | undefined; validatePropertyTypes?: boolean | undefined; }'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(275,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(343,7): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ parameterSchema?: Record<string, any> | undefined; validatePropertyTypes?: boolean | undefined; }'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(355,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(395,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(493,13): error TS6133: 'sourceId' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(511,11): error TS6133: 'query' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(529,5): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(595,11): error TS6133: 'query' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(610,16): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(635,13): error TS6133: 'query' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(635,67): error TS6133: 'limit' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(635,79): error TS6133: 'offset' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(643,11): error TS6133: 'searchQuery' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(686,38): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(702,7): error TS2353: Object literal may only specify known properties, and 'name' does not exist in type '{ parameterSchema?: Record<string, any> | undefined; validatePropertyTypes?: boolean | undefined; }'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(707,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(730,16): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(756,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(778,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(835,7): error TS2353: Object literal may only specify known properties, and 'entities' does not exist in type '{ parameterSchema?: Record<string, any> | undefined; validatePropertyTypes?: boolean | undefined; }'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(861,5): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(871,5): error TS2353: Object literal may only specify known properties, and 'action' does not exist in type 'AuditLogConfig'.
src/lib/examples/07-multi-tenancy/04-tenant-decorators.example.ts(943,5): error TS2322: Type 'number' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(16,53): error TS6133: 'Put' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(16,58): error TS6133: 'Delete' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(16,86): error TS6133: 'UseGuards' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(18,26): error TS6133: 'Interval' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(18,48): error TS2307: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(23,3): error TS2305: Module '"../../../index"' has no exported member 'TenantConfig'.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(24,3): error TS2724: '"../../../index"' has no exported member named 'MultiTenantConfigurations'. Did you mean 'MultiTenantDecorators'?
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(27,3): error TS6133: 'ValidateTenantLimits' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(29,3): error TS6133: 'MultiTenantQuery' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(179,22): error TS6138: Property 'configService' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(1085,31): error TS7006: Parameter 'request' implicitly has an 'any' type.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(1109,36): error TS7006: Parameter 'request' implicitly has an 'any' type.
src/lib/examples/07-multi-tenancy/05-enterprise-saas.example.ts(1109,45): error TS7006: Parameter 'tenantId' implicitly has an 'any' type.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(16,44): error TS6133: 'OnModuleDestroy' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(18,48): error TS2307: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(19,10): error TS2305: Module '"@nestjs/terminus"' has no exported member 'HealthCheckModule'.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(20,34): error TS2307: Cannot find module '@willsoto/nestjs-prometheus' or its corresponding type declarations.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(24,3): error TS6133: 'TenantContextService' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'TenantConnectionManager'.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(133,9): error TS2322: Type 'string | undefined' is not assignable to type 'string'.
  Type 'undefined' is not assignable to type 'string'.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(204,11): error TS6133: 'metricsCollectors' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(388,22): error TS6138: Property 'multiTenantNeo4j' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(678,11): error TS6133: 'config' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(737,11): error TS6133: 'startTime' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(865,13): error TS6133: 'connectionStats' is declared but its value is never read.
src/lib/examples/07-multi-tenancy/06-production-deployment.example.ts(1080,30): error TS2339: Property 'user' does not exist on type 'Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>'.
src/lib/examples/07-multi-tenancy/index.ts(156,1): error TS2308: Module './01-module-setup.example' has already exported a member named 'ProductionMultiTenantModule'. Consider explicitly re-exporting to resolve the ambiguity.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(8,22): error TS2307: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(10,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jHealthService'.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(11,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jConnectionService'. Did you mean 'NeogmaConnectionService'?
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(12,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jMetricsService'. Did you mean 'NeogmaMetricsService'?
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(13,3): error TS2305: Module '"../../../index"' has no exported member 'FindOne'.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(14,3): error TS2305: Module '"../../../index"' has no exported member 'CreateEntity'.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(15,8): error TS2305: Module '"../../../index"' has no exported member 'ComprehensiveMetrics'.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(106,22): error TS6138: Property 'terminusHealthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(273,52): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/01-health-monitoring.example.ts(754,22): error TS6138: Property 'healthMonitoring' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(7,22): error TS2307: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(10,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jMetricsService'. Did you mean 'NeogmaMetricsService'?
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(11,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jConnectionService'. Did you mean 'NeogmaConnectionService'?
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(12,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jHealthService'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(13,3): error TS2305: Module '"../../../index"' has no exported member 'FindMany'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(14,3): error TS2305: Module '"../../../index"' has no exported member 'CreateEntity'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(14,3): error TS6133: 'CreateEntity' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(15,3): error TS2305: Module '"../../../index"' has no exported member 'UpdateEntity'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(15,3): error TS6133: 'UpdateEntity' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(16,3): error TS2305: Module '"../../../index"' has no exported member 'CountEntities'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(18,8): error TS2305: Module '"../../../index"' has no exported member 'ConnectionPoolMetrics'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(87,11): error TS6133: 'queryPatternMetrics' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(117,22): error TS6138: Property 'healthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(181,7): error TS7006: Parameter 'm' implicitly has an 'any' type.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(192,29): error TS7006: Parameter 'metric' implicitly has an 'any' type.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(193,7): error TS7053: Element implicitly has an 'any' type because expression of type 'any' can't be used to index type 'Record<"READ" | "WRITE" | "MIXED", number>'.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(209,11): error TS6133: 'connectionStatus' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(230,11): error TS6133: 'startTime' is declared but its value is never read.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(349,51): error TS7006: Parameter 'metric' implicitly has an 'any' type.
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(401,7): error TS2322: Type '{ pattern: string; count: number; avgTime: number; cacheHitRate: number; examples: QueryMetrics[]; }[]' is not assignable to type '{ pattern: string; hitRate: number; frequency: number; }[]'.
  Type '{ pattern: string; count: number; avgTime: number; cacheHitRate: number; examples: QueryMetrics[]; }' is missing the following properties from type '{ pattern: string; hitRate: number; frequency: number; }': hitRate, frequency
src/lib/examples/08-production-patterns/02-performance-metrics.example.ts(409,22): error TS2339: Property 'queryType' does not exist on type 'QueryMetrics'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(7,1): error TS6133: 'Retry' is declared but its value is never read.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(7,10): error TS2305: Module '"@nestjs/terminus"' has no exported member 'Retry'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(10,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jHealthService'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(11,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jConnectionService'. Did you mean 'NeogmaConnectionService'?
src/lib/examples/08-production-patterns/03-error-handling.example.ts(12,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jMetricsService'. Did you mean 'NeogmaMetricsService'?
src/lib/examples/08-production-patterns/03-error-handling.example.ts(13,3): error TS2305: Module '"../../../index"' has no exported member 'FindOne'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(14,3): error TS2305: Module '"../../../index"' has no exported member 'FindMany'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(15,3): error TS2305: Module '"../../../index"' has no exported member 'CreateEntity'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(16,3): error TS2305: Module '"../../../index"' has no exported member 'UpdateEntity'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(17,3): error TS2305: Module '"../../../index"' has no exported member 'DeleteEntity'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(116,22): error TS6138: Property 'healthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(117,22): error TS6138: Property 'connectionService' is declared but its value is never read.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(203,9): error TS2322: Type 'unknown' is not assignable to type 'T'.
  'T' could be instantiated with an arbitrary type which could be unrelated to 'unknown'.
src/lib/examples/08-production-patterns/03-error-handling.example.ts(664,4): error TS2304: Cannot find name 'CountEntities'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(9,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jHealthService'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(10,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jConnectionService'. Did you mean 'NeogmaConnectionService'?
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(11,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jMetricsService'. Did you mean 'NeogmaMetricsService'?
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(12,3): error TS2305: Module '"../../../index"' has no exported member 'FindOne'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(13,3): error TS2305: Module '"../../../index"' has no exported member 'FindMany'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(14,3): error TS2305: Module '"../../../index"' has no exported member 'CreateEntity'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(15,3): error TS2305: Module '"../../../index"' has no exported member 'UpdateEntity'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(16,3): error TS2305: Module '"../../../index"' has no exported member 'DeleteEntity'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(17,3): error TS2305: Module '"../../../index"' has no exported member 'CountEntities'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(67,22): error TS6138: Property 'healthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(68,22): error TS6138: Property 'connectionService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(69,22): error TS6138: Property 'metricsService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(74,18): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(83,19): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(92,23): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(111,23): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(126,23): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(137,24): error TS2693: 'TestUser' only refers to a type, but is being used as a value here.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(176,49): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(180,18): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(220,18): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(237,7): error TS6133: 'mockHealthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(238,7): error TS6133: 'mockConnectionService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(239,7): error TS6133: 'mockMetricsService' is declared but its value is never read.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(656,67): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/04-testing-strategies.example.ts(712,7): error TS2322: Type 'Mock<any, any, any>' is not assignable to type 'Mocked<T>[keyof T]'.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(7,22): error TS2307: Cannot find module '@nestjs/schedule' or its corresponding type declarations.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(9,40): error TS2307: Cannot find module '../../services/neo4j-connection.service' or its corresponding type declarations.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(10,36): error TS2307: Cannot find module '../../services/neo4j-health.service' or its corresponding type declarations.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(11,49): error TS2307: Cannot find module '../../decorators/entity-crud.decorators' or its corresponding type declarations.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(117,22): error TS6138: Property 'metricsService' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(117,38): error TS2304: Cannot find name 'Neo4jMetricsService'.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(118,22): error TS6138: Property 'healthService' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(177,60): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(312,13): error TS6133: 'connectionStatus' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(319,13): error TS6133: 'successfulHealthChecks' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(564,11): error TS6133: 'timeout' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(773,20): error TS6133: 'logger' is declared but its value is never read.
src/lib/examples/08-production-patterns/05-connection-management.example.ts(777,22): error TS6138: Property 'connectionManager' is declared but its value is never read.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(10,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jHealthService'.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(11,3): error TS2724: '"../../../index"' has no exported member named 'Neo4jConnectionService'. Did you mean 'NeogmaConnectionService'?
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(300,66): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(315,6): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(318,17): error TS6133: 'testWriteOperations' is declared but its value is never read.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(423,6): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(439,26): error TS2339: Property 'metricsService' does not exist on type 'Neo4jProductionDeploymentManager'.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(689,20): error TS6133: 'logger' is declared but its value is never read.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(692,22): error TS6138: Property 'deploymentManager' is declared but its value is never read.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(694,22): error TS6138: Property 'connectionService' is declared but its value is never read.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(896,31): error TS7006: Parameter 'check' implicitly has an 'any' type.
src/lib/examples/08-production-patterns/06-deployment-operations.example.ts(920,31): error TS7006: Parameter 'check' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(43,74): error TS2353: Object literal may only specify known properties, and 'composite' does not exist in type 'IndexDecoratorConfig'.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(48,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(48,22): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(147,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(147,31): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(198,65): error TS2353: Object literal may only specify known properties, and 'composite' does not exist in type 'IndexDecoratorConfig'.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(202,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(202,20): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(207,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(207,23): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(435,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(435,21): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(486,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(486,35): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(545,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/09-constraints-and-schema/01-database-constraints.example.ts(545,27): error TS2554: Expected 0-1 arguments, but got 2.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(24,3): error TS2305: Module '"../../../index"' has no exported member 'Email'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'Range'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(26,3): error TS2305: Module '"../../../index"' has no exported member 'Length'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(27,3): error TS2305: Module '"../../../index"' has no exported member 'Pattern'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(28,3): error TS2305: Module '"../../../index"' has no exported member 'Custom'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(33,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(44,14): error TS2323: Cannot redeclare exported variable 'ValidatedProductEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(214,14): error TS2323: Cannot redeclare exported variable 'BankAccountEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(348,22): error TS7053: Element implicitly has an 'any' type because expression of type 'string' can't be used to index type '{ US: RegExp; GB: RegExp; DE: RegExp; }'.
  No index signature with a parameter of type 'string' was found on type '{ US: RegExp; GB: RegExp; DE: RegExp; }'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(375,14): error TS2323: Cannot redeclare exported variable 'SecureUserEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(569,14): error TS2323: Cannot redeclare exported variable 'ModeratedContentEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(622,31): error TS2532: Object is possibly 'undefined'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(708,11): error TS6133: 'findRepeatedPhrases' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(732,14): error TS2323: Cannot redeclare exported variable 'ValidationDemonstrationService'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(753,36): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(841,11): error TS6133: 'constructor' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(856,56): error TS18046: 'error' is of type 'unknown'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(871,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(944,3): error TS2323: Cannot redeclare exported variable 'ValidatedProductEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(944,3): error TS2484: Export declaration conflicts with exported declaration of 'ValidatedProductEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(945,3): error TS2323: Cannot redeclare exported variable 'BankAccountEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(945,3): error TS2484: Export declaration conflicts with exported declaration of 'BankAccountEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(946,3): error TS2323: Cannot redeclare exported variable 'SecureUserEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(946,3): error TS2484: Export declaration conflicts with exported declaration of 'SecureUserEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(947,3): error TS2323: Cannot redeclare exported variable 'ModeratedContentEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(947,3): error TS2484: Export declaration conflicts with exported declaration of 'ModeratedContentEntity'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(948,3): error TS2323: Cannot redeclare exported variable 'ValidationDemonstrationService'.
src/lib/examples/09-constraints-and-schema/02-custom-validation.example.ts(948,3): error TS2484: Export declaration conflicts with exported declaration of 'ValidationDemonstrationService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(22,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(24,3): error TS2724: '"../../../index"' has no exported member named 'ConstraintServiceConfig'. Did you mean 'ConstraintService'?
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(25,3): error TS2305: Module '"../../../index"' has no exported member 'ConstraintOperationResult'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(26,3): error TS2305: Module '"../../../index"' has no exported member 'EntityConstraintInfo'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(26,3): error TS6133: 'EntityConstraintInfo' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(27,3): error TS2305: Module '"../../../index"' has no exported member 'ConstraintStatistics'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(27,3): error TS6133: 'ConstraintStatistics' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(28,8): error TS2305: Module '"../../../index"' has no exported member 'ConstraintMetadata'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(28,8): error TS6133: 'ConstraintMetadata' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(29,8): error TS2305: Module '"../../../index"' has no exported member 'ConstraintCreationStatus'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(29,8): error TS6133: 'ConstraintCreationStatus' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(30,8): error TS2305: Module '"../../../index"' has no exported member 'ConstraintValidationResult'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(30,8): error TS6133: 'ConstraintValidationResult' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(32,10): error TS2305: Module '"./01-database-constraints.example"' has no exported member 'ValidatedProductEntity'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(32,34): error TS2724: '"./01-database-constraints.example"' has no exported member named 'BankAccountEntity'. Did you mean 'AccountEntity'?
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(42,14): error TS2323: Cannot redeclare exported variable 'SchemaDeploymentService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(155,39): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(257,38): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(322,37): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(357,14): error TS2323: Cannot redeclare exported variable 'MultiTenantConstraintService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(433,53): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(476,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(488,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(498,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(537,14): error TS2323: Cannot redeclare exported variable 'ConstraintMonitoringService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(704,51): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(717,34): error TS7006: Parameter 'duplicate' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(816,14): error TS2323: Cannot redeclare exported variable 'EnvironmentConstraintStrategy'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(847,11): error TS6133: 'config' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(866,11): error TS6133: 'config' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(888,11): error TS6133: 'config' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(908,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(927,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(949,3): error TS2323: Cannot redeclare exported variable 'SchemaDeploymentService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(949,3): error TS2484: Export declaration conflicts with exported declaration of 'SchemaDeploymentService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(950,3): error TS2323: Cannot redeclare exported variable 'MultiTenantConstraintService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(950,3): error TS2484: Export declaration conflicts with exported declaration of 'MultiTenantConstraintService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(951,3): error TS2323: Cannot redeclare exported variable 'ConstraintMonitoringService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(951,3): error TS2484: Export declaration conflicts with exported declaration of 'ConstraintMonitoringService'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(952,3): error TS2323: Cannot redeclare exported variable 'EnvironmentConstraintStrategy'.
src/lib/examples/09-constraints-and-schema/03-constraint-service.example.ts(952,3): error TS2484: Export declaration conflicts with exported declaration of 'EnvironmentConstraintStrategy'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(22,3): error TS2305: Module '"../../../index"' has no exported member 'Neo4jService'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(24,8): error TS2305: Module '"../../../index"' has no exported member 'ConstraintMetadata'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(25,8): error TS2305: Module '"../../../index"' has no exported member 'ConstraintOperationResult'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(25,8): error TS6133: 'ConstraintOperationResult' is declared but its value is never read.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(68,14): error TS2323: Cannot redeclare exported variable 'ProductionSchemaManager'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(91,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(312,37): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(363,36): error TS2345: Argument of type '"Consider optimizing constraint validation logic"' is not assignable to parameter of type 'never'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(367,36): error TS2345: Argument of type '"Review index usage and remove unused indexes"' is not assignable to parameter of type 'never'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(371,36): error TS2345: Argument of type '"Optimize slow queries identified in analysis"' is not assignable to parameter of type 'never'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(600,51): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(606,33): error TS7006: Parameter 'r' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(611,49): error TS7006: Parameter 'v' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(642,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(651,35): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(712,14): error TS2323: Cannot redeclare exported variable 'SchemaTestingService'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(802,38): error TS7006: Parameter 'session' implicitly has an 'any' type.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(854,3): error TS2323: Cannot redeclare exported variable 'ProductionSchemaManager'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(854,3): error TS2484: Export declaration conflicts with exported declaration of 'ProductionSchemaManager'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(855,3): error TS2323: Cannot redeclare exported variable 'SchemaTestingService'.
src/lib/examples/09-constraints-and-schema/04-schema-management.example.ts(855,3): error TS2484: Export declaration conflicts with exported declaration of 'SchemaTestingService'.
src/lib/examples/shared/entities/basic/product.entity.ts(61,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/basic/product.entity.ts(73,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/basic/product.entity.ts(87,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/basic/product.entity.ts(94,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/basic/product.entity.ts(101,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/dto/create-product.dto.ts(42,4): error TS2304: Cannot find name 'Max'.
src/lib/examples/shared/entities/dto/update-order.dto.ts(16,21): error TS1272: A type referenced in a decorated signature must be imported with 'import type' or a namespace import when 'isolatedModules' and 'emitDecoratorMetadata' are enabled.
src/lib/examples/shared/entities/enterprise/auditable-product.entity.ts(45,11): error TS2322: Type '[string, string]' is not assignable to type 'string'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(77,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(77,9): error TS2559: Type 'string[]' has no properties in common with type 'Omit<UniqueConfig, "properties">'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(78,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(78,9): error TS2559: Type 'string[]' has no properties in common with type 'Omit<UniqueConfig, "properties">'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(103,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(110,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(110,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(121,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(121,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(134,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(141,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(141,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(147,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(153,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(153,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(158,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(164,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(164,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/enterprise-user.entity.ts(260,5): error TS2561: Object literal may only specify known properties, but 'validator' does not exist in type 'ValidateConfig'. Did you mean to write 'validation'?
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(65,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(65,4): error TS2554: Expected 1 arguments, but got 0.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(65,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(70,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(70,4): error TS2554: Expected 1 arguments, but got 0.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(70,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(98,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(98,4): error TS2554: Expected 1 arguments, but got 0.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(98,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(125,3): error TS1240: Unable to resolve signature of property decorator when called as an expression.
  The runtime will invoke the decorator with 2 arguments, but the decorator expects 3.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(125,4): error TS2554: Expected 1 arguments, but got 0.
src/lib/examples/shared/entities/enterprise/secure-user.entity.ts(125,4): error TS1271: Decorator function return type is 'void | TypedPropertyDescriptor<unknown>' but is expected to be 'void' or 'any'.
  Type 'TypedPropertyDescriptor<unknown>' is not assignable to type 'void'.
src/lib/examples/shared/entities/enterprise/tenanted-organization.entity.ts(45,11): error TS2322: Type '[string]' is not assignable to type 'string'.
src/lib/examples/shared/entities/enterprise/tenanted-organization.entity.ts(357,58): error TS2345: Argument of type 'string' is not assignable to parameter of type 'never'.
src/lib/examples/shared/entities/intermediate/company.entity.ts(60,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/shared/entities/intermediate/company.entity.ts(60,9): error TS2559: Type 'string[]' has no properties in common with type 'Omit<UniqueConfig, "properties">'.
src/lib/examples/shared/entities/intermediate/company.entity.ts(61,1): error TS1238: Unable to resolve signature of class decorator when called as an expression.
  The runtime will invoke the decorator with 1 arguments, but the decorator expects 2.
src/lib/examples/shared/entities/intermediate/company.entity.ts(61,9): error TS2559: Type 'string[]' has no properties in common with type 'Omit<UniqueConfig, "properties">'.
src/lib/examples/shared/entities/intermediate/post.entity.ts(384,13): error TS2554: Expected 0 arguments, but got 1.
src/lib/repositories/graph-repository.ts(87,43): error TS2344: Type 'Neo4jSupportedProperties' does not satisfy the constraint 'NeogmaEntity'.
  Property 'id' is missing in type 'Neo4jSupportedProperties' but required in type 'NeogmaEntity'.
src/lib/repositories/graph-repository.ts(107,56): error TS2353: Object literal may only specify known properties, and 'id' does not exist in type 'Integer | Point<Integer> | Date<Integer> | Time<Integer> | LocalTime<Integer> | DateTime<Integer> | LocalDateTime<...> | Duration<...> | Neo4jSingleTypes[] | Literal'.
src/lib/repositories/neogma.repository.ts(61,9): error TS2464: A computed property name must be of type 'string', 'number', 'symbol', or 'any'.
src/lib/repositories/neogma.repository.ts(124,9): error TS2416: Property 'findOne' in type 'NeogmaRepository<T>' is not assignable to the same property in base type 'NeogmaRepository<T>'.
  Type '(where: Partial<T>) => Promise<T | null>' is not assignable to type '(id: string) => Promise<T | null>'.
    Types of parameters 'where' and 'id' are incompatible.
      Type 'string' is not assignable to type 'Partial<T>'.
src/lib/repositories/repository.decorator.ts(211,15): error TS2322: Type 'NeogmaEntity | null' is not assignable to type '{ toJson(): Record<string, unknown>; } | null'.
  Type 'NeogmaEntity' is not assignable to type '{ toJson(): Record<string, unknown>; }'.
    Types of property 'toJson' are incompatible.
      Type '(() => NeogmaEntity) | undefined' is not assignable to type '() => Record<string, unknown>'.
        Type 'undefined' is not assignable to type '() => Record<string, unknown>'.
```
