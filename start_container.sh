docker run -d \
    -p 27017:27017 \
    --name mj_mongo \
    -v mongo-data:/data/db \
    -e MONGODB_INITDB_ROOT_USERNAME=user \
    -e MONGODB_INITDB_ROOT_PASSWORD_FILE=mongo \
    mongo:latest
