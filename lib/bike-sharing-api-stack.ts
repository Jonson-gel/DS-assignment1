import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { bikes, stations } from "../seed/bikes";
import * as apig from "aws-cdk-lib/aws-apigateway";

export class BikeSharingApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Tables 
        const bikesTable = new dynamodb.Table(this, "BikesTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "bikeId", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Bikes",
        });

        const stationsTable = new dynamodb.Table(this, "StationsTable", {
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            partitionKey: { name: "stationId", type: dynamodb.AttributeType.NUMBER },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            tableName: "Stations",
        });

        // Functions 
        const getBikeByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetBikeByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getBikeById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: bikesTable.tableName,
                    REGION: 'eu-west-1',
                },
            }
        );

        const getAllBikesFn = new lambdanode.NodejsFunction(
            this,
            "GetAllBikesFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_18_X,
                entry: `${__dirname}/../lambdas/getAllBikes.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: bikesTable.tableName,
                    REGION: 'eu-west-1',
                },
            }
        );

        const newBikeFn = new lambdanode.NodejsFunction(
            this,
            "AddBikeFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: `${__dirname}/../lambdas/addBike.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: bikesTable.tableName,
                REGION: "eu-west-1",
            },
        }
        );

        const deleteBikeFn = new lambdanode.NodejsFunction(
            this,
            "DeleteBikeFn", {
            architecture: lambda.Architecture.ARM_64,
            runtime: lambda.Runtime.NODEJS_18_X,
            entry: `${__dirname}/../lambdas/deleteBike.ts`,
            timeout: cdk.Duration.seconds(10),
            memorySize: 128,
            environment: {
                TABLE_NAME: bikesTable.tableName,
                REGION: "eu-west-1",
            },
        }
        );

        const getBikeByStationIdFn = new lambdanode.NodejsFunction(
            this,
            "GetBikeByStationIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: `${__dirname}/../lambdas/getBikeByStationId.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: bikesTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const updateBikeFn = new lambdanode.NodejsFunction(
            this,
            "updateBikeFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: `${__dirname}/../lambdas/updateBike.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: bikesTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const getAllStationsFn = new lambdanode.NodejsFunction(
            this,
            "GetAllStationsFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: `${__dirname}/../lambdas/getAllStations.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: stationsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        const getStationByIdFn = new lambdanode.NodejsFunction(
            this,
            "GetStationByIdFn",
            {
                architecture: lambda.Architecture.ARM_64,
                runtime: lambda.Runtime.NODEJS_16_X,
                entry: `${__dirname}/../lambdas/getStationById.ts`,
                timeout: cdk.Duration.seconds(10),
                memorySize: 128,
                environment: {
                    TABLE_NAME: stationsTable.tableName,
                    REGION: "eu-west-1",
                },
            }
        );

        new custom.AwsCustomResource(this, "bikesddbInitData", {
            onCreate: {
                service: "DynamoDB",
                action: "batchWriteItem",
                parameters: {
                    RequestItems: {
                        [bikesTable.tableName]: generateBatch(bikes),
                        [stationsTable.tableName]: generateBatch(stations),
                    },
                },
                physicalResourceId: custom.PhysicalResourceId.of("bikesddbInitData"),
            },
            policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
                resources: [bikesTable.tableArn, stationsTable.tableArn],
            }),
        });

        // Permissions 
        bikesTable.grantReadData(getAllBikesFn);
        bikesTable.grantReadData(getBikeByIdFn);
        bikesTable.grantReadWriteData(newBikeFn);
        bikesTable.grantReadWriteData(updateBikeFn);
        bikesTable.grantWriteData(deleteBikeFn);
        bikesTable.grantReadData(getBikeByStationIdFn);
        stationsTable.grantReadData(getAllStationsFn);
        stationsTable.grantReadData(getStationByIdFn);

        // REST API 
        const api = new apig.RestApi(this, "RestAPI", {
            description: "demo api",
            deployOptions: {
                stageName: "dev",
            },
            defaultCorsPreflightOptions: {
                allowHeaders: ["Content-Type", "X-Amz-Date"],
                allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
                allowCredentials: true,
                allowOrigins: ["*"],
            },
        });

        const bikesEndpoint = api.root.addResource("bikes");
        bikesEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllBikesFn, { proxy: true })
        );

        bikesEndpoint.addMethod(
            "POST",
            new apig.LambdaIntegration(newBikeFn, { proxy: true })
        );

        const bikeEndpoint = bikesEndpoint.addResource("{bikeId}");
        bikeEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getBikeByIdFn, { proxy: true })
        );

        bikeEndpoint.addMethod(
            "PUT",
            new apig.LambdaIntegration(updateBikeFn, { proxy: true })
        );

        bikeEndpoint.addMethod(
            "DELETE",
            new apig.LambdaIntegration(deleteBikeFn, { proxy: true })
        );

        const bikeByStationEndpoint = bikesEndpoint.addResource("station");
        const bikeByStationIdEndpoint = bikeByStationEndpoint.addResource("{stationId}");

        bikeByStationIdEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getBikeByStationIdFn, { proxy: true })
        );

        const stationsEndpoint = api.root.addResource("stations");
        stationsEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getAllStationsFn, { proxy: true })
        );

        const stationEndpoint = stationsEndpoint.addResource("{stationId}");
        stationEndpoint.addMethod(
            "GET",
            new apig.LambdaIntegration(getStationByIdFn, { proxy: true })
        );


    }
}
