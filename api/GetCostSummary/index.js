module.exports = async function (context, req) {

    context.res = {
        status: 200,
        body: {
            message: "Function is running",
            currentSpend: 123.45,
            budget: 200
        }
    };

};